const BN = require("bn.js");
const uint256 = new BN(2).pow(new BN(256));

//Naive Implementation. It's not very performant
const globalState = () => {
  return {
    callState: callState(),
    subState: subState(),
    message: message(),
    txData: txData(),
    blockInfo: blockInfo(),
    accounts: accounts(),
    env: env()
  };
};

const account = () => {
  return {
    address: "",
    balance: 0,
    code: "",
    storage: {},
    nonce: 0
  };
};

const env = () => {
  return {
    address: 0,
    contract: account(),
    intiCode: "",
    runtimeCode: "",
    returnValue: 0
  };
};

const message = () => {
  return {
    msgHash: "",
    txNonce: 0,
    txGasPrice: 0,
    txGasLimit: 0,
    to: 0,
    value: 0,
    sigV: 0,
    sigR: 0,
    sigS: 0,
    data: ""
  };
};

const callState = () => {
  return {
    code: "",
    bytes: "",
    id: 0,
    caller: "",
    callData: "",
    callValue: "",
    stack: [],
    memory: [],
    pc: 0,
    gas: 0,
    memoryUsed: 0,
    previousGas: 0,
    static: false,
    depth: 0,
    halt: false,
    address: ""
  };
};
const subState = () => {
  return {
    selfDestruct: false,
    log: "",
    refund: 0
  };
};

const txData = () => {
  return {
    gasprice: 0,
    origin: ""
  };
};

const blockInfo = () => {
  return {
    previousHash: 0,
    ommersHash: 0,
    coinbase: 0,
    stateRoot: 0,
    transactionsRoot: 0,
    receiptsRoot: 0,
    logsBloom: [],
    difficulty: 0,
    number: 0,
    gasLimit: 0,
    gasUsed: 0,
    timestamp: 0,
    extraData: [],
    mixHash: 0,
    blockNonce: 0,
    ommerBlockHeaders: 0,
    blockhash: ""
  };
};

const getOp = (call, pc = call.pc) => {
  if (call.pc > call.code.length) {
    return "";
  }
  return parseInt(call.code[pc] + call.code[pc + 1], 16);
};

function step(globalState) {
  const callState = { ...globalState.callState };
  //lookup next opcode
  let opcode = getOp(callState);
  //STOP if
  if (callState.halt || opcode == "" || opcode == 0 || opcode == NaN) {
    return { ...globalState, callState };
  }
  // Check if there's enough gas

  //Execute
  return step(codes(opcode)(globalState));
}

const codes = op => {
  //PUSH opcodes
  if (op >= 0x60 && op <= 0x7f) {
    return PUSH(op);
  }

  //SWAP opcodes
  if (op >= 0x90 && op <= 0x9f) {
    return SWAP(op);
  }

  //DUP opcodes
  if (op >= 0x80 && op <= 0x8f) {
    return DUP(op);
  }

  if (op)
    switch (op) {
      case 0x01:
        return stackOp2(ADD);
      case 0x02:
        return stackOp2(MUL);
      case 0x03:
        return stackOp2(SUB);
      case 0x04:
        return stackOp2(DIV);
      case 0x05:
        return stackOp2(SDIV);
      case 0x06:
        return stackOp2(MOD);
      case 0x07:
        return stackOp2(SMOD);
      case 0x08:
        return stackOp3(ADDMOD);
      case 0x09:
        return stackOp3(MULMOD);
      case 0x0a:
        return stackOp2(EXP);
      case 0x0b:
        return stackOp2(SIGNEXTEND);
      case 0x10:
        return stackOp2(LT);
      case 0x11:
        return stackOp2(GT);
      case 0x12:
        return stackOp2(SLT);
      case 0x13:
        return stackOp2(SGT);
      case 0x14:
        return stackOp2(EQ);
      case 0x15:
        return stackOp1(ISZERO);
      case 0x16:
        return stackOp2(AND);
      case 0x17:
        return stackOp2(OR);
      case 0x18:
        return stackOp2(XOR);
      case 0x19:
        return stackOp1(NOT);
      case 0x1a:
        return stackOp2(BYTE);
      case 0x30:
        return stateToStack(["env", "address"]);
      case 0x32:
        return stateToStack(["txData", "origin"]);
      case 0x33:
        return stateToStack(["callState", "caller"]);
      case 0x34:
        return stateToStack(["callState", "callValue"]);
      case 0x41:
        return stateToStack(["blockInfo", "coinbase"]);
      case 0x42:
        return stateToStack(["blockInfo", "timestamp"]);
      case 0x43:
        return stateToStack(["blockInfo", "number"]);
      case 0x44:
        return stateToStack(["blockInfo", "difficulty"]);
      case 0x45:
        return stateToStack(["blockInfo", "gasLimit"]);
      case 0x51:
        return MLOAD();
      case 0x52:
      case 0x53:
        return MSTORE();
      case 0x54:
        return SLOAD();
      case 0x55:
        return SSTORE();
      case 0x56:
        return JUMP();
      case 0x57:
        return JUMPI();
      case 0x5b:
        return JUMPDEST();
      case 0xf1:
        return CALL();
      case 0xf2:
        return RETURNOP();
      default:
        return errorState();
    }
};

const errorState = () => globalState => {
  return { ...globalState, callState: { ...callState, halt: true } };
};

const PUSH = op => globalState => {
  let word = globalState.callState.code.substr(callState.pc + 2, op - 0x5e);
  let pc = globalState.callState.pc + (op - 0x5e) * 2;

  return {
    ...globalState,
    callState: {
      ...callState,
      pc,
      stack: [...callState.stack, new BN(word)]
    }
  };
};

const DUP = (op = globalState => {
  const pos = op - 0x7f;
  let stack = [...globalState.callState.stack];
  stack.concat(stack[stack.length - pos]);
  return {
    ...globalState,
    callState: {
      ...globalState.callState,
      stack
    }
  };
});

const SWAP = op => globalState => {
  const pos = op - 0x8f;
  let stack = [...globalState.callState.stack];
  const head = stack[0];
  const temp = stack[stack.length - pos];
  stack[stack.length - pos] = head;
  stack[0] = temp;
  return {
    ...globalState,
    callState: {
      ...globalState.callState,
      stack
    }
  };
};

const JUMPI = () => globalState => {
  const [dest, cond] = globalState.callState.stack.slice(0, 2);
  const destOp = getOP(globalState.callState, dest.toNumber());

  if (destOp != 0x5b) {
    return errorState();
  }

  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(2)],
      pc: cond.isZero() ? callState.pc + 2 : dest + 1
    }
  };
};

const JUMPDEST = () => globalState => {
  return {
    ...globalState,
    callState: {
      ...callState,
      pc: globalState.callState.pc + 2
    }
  };
};

const JUMP = () => globalState => {
  const [dest] = globalState.callState.stack.slice(0, 1);
  const destOp = getOP(globalState.callState, dest.toNumber());

  if (destOp != 0x5b) {
    return errorState();
  }

  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(2)],
      pc: dest
    }
  };
};

const MLOAD = () => globalState => {
  const a = globalState.callState.stack.slice(0, 1);
  const word = globalState.callState.memory.slice(a, a + 32);
  return {
    ...globalState,
    callState: {
      ...globalState.callState,
      stack: [...globalState.callState.stack.slice(1), new BN(word)],
      pc: globalState.callState.pc + 2
    }
  };
};

const SLOAD = () => globalState => {
  const key = globalState.callState.stack.slice(0, 1);
  const value = getAccount().storage[new Buffer(key)];
  return {
    ...globalState,
    callState: {
      ...globalState.callState,
      stack: [...globalState.callState.stack.slice(1), new BN(value)],
      pc: globalState.callState.pc + 2
    }
  };
};

const SSTORE = () => globalState => {
  const [key, value] = globalState.callState.stack.slice(0, 2);
  const account = getAccount();
  account.storage[key] = value;
  return {
    ...putAccount(account),
    callState: {
      ...globalState.callState,
      stack: [...globalState.callState.stack.slice(2)],
      pc: globalState.callState.pc + 2
    }
  };
};

const toBuffer = value => {
  return value.toArray("be", 32);
};

const MSTORE = () => globalState => {
  const [offset, value] = globalState.callState.stack.slice(0, 2);
  const valueArray = toBuffer(value);
  const mem = globalState.callState.memory;
  const memory = [
    ...mem.slice(0, offset),
    ...valueArray,
    ...mem.slice(offset + value.length)
  ];
  return {
    ...globalState,
    callState: {
      ...globalState.callState,
      stack: [...globalState.callState.stack.slice(2)],
      memory,
      pc: globalState.callState.pc + 2
    }
  };
};

const getAccount = globalState => (address = globalState.env.address) => {
  return globalState.accounts[address];
};

const putAccount = globalState => account => {
  const newState = { ...globalState };
  newState.accounts[globalState.address.to] = account;
  return newState;
};

//Read `item` form globalState and add it to the stack
const stateToStack = path => globalState => {
  const item = path.reduce((state, key) => {
    return state[key];
  }, globalState);

  return {
    ...globalState,
    callState: {
      ...callState,
      pc: globalState.callState.pc + 2,
      stack: [...globalState.callState.stack, item]
    }
  };
};

const stackOp1 = op => globalState => {
  const a = globalState.callState.stack.slice(0, 1);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(1), op(a)],
      pc: callState.pc + 2
    }
  };
};

const stackOp2 = op => globalState => {
  const [a, b] = globalState.callState.stack.slice(0, 2);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(2), op(a, b)],
      pc: callState.pc + 2
    }
  };
};

const stackOp3 = op => globalState => {
  const [a, b, c] = globalState.callState.stack.slice(0, 3);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(3), op(a, b, c)],
      pc: callState.pc + 2
    }
  };
};

//ARITHMETIC
const ADD = (a, b) => a.add(b).mod(uint256);
const MUL = (a, b) => a.mul(b).mod(uint256);
const SUB = (a, b) => a.sub(b).mod(uint256);
const DIV = (a, b) => (b.isZero() ? new BN(b) : a.div(b));

const SDIV = (a, b) =>
  b.isZero()
    ? new BN(b)
    : a
        .fromTwos(256)
        .div(b.fromTwos(256))
        .toTwos(256);

const MOD = (a, b) => a.mod(b);
const SMOD = (a, b) => {
  if (b.isZero()) {
    r = new BN(b);
  } else {
    a = a.fromTwos(256);
    b = b.fromTwos(256);
    r = a.abs().mod(b.abs());
    if (a.isNeg()) {
      r = r.ineg();
    }
    r = r.toTwos(256);
  }
  return r;
};

const ADDMOD = (a, b, c) => a.add(b.mod(c));
const MULMOD = (a, b, c) => a.mul(b.mod(c));

const EXP = (a, b) => a.pow(b).mod(uint256); //NOTE EXP cost dynamic gas, That's no dealt with yet
const SIGNEXTEND = (k, val) => {
  val = val.toArrayLike(Buffer, "be", 32);
  var extendOnes = false;

  if (k.lten(31)) {
    k = k.toNumber();

    if (val[31 - k] & 0x80) {
      extendOnes = true;
    }

    // 31-k-1 since k-th byte shouldn't be modified
    for (var i = 30 - k; i >= 0; i--) {
      val[i] = extendOnes ? 0xff : 0;
    }
  }

  return new BN(val);
};

// COMPARISSON
const LT = (a, b) => new BN(a < b ? 1 : 0);
const GT = (a, b) => new BN(a > b ? 1 : 0);
const SLT = (a, b) => new BN(a.fromTwos(256).lt(b.fromTwos(256)) ? 1 : 0);
const SGT = (a, b) => new BN(a.fromTwos(256).gt(b.fromTwos(256)) ? 1 : 0);
const EQ = (a, b) => new BN(a == b ? 1 : 0);
const ISZERO = a => new BN(a == 0 ? 1 : 0);

//BIT
const AND = (a, b) => a.and(b);
const OR = (a, b) => a.or(b);
const XOR = (a, b) => a.xor(b);
const NOT = a => a.notn(256);
const BYTE = (a, b) =>
  new BN(a.gten(32) ? 0 : b.shrn((31 - a.toNumber()) * 8).andln(0xff));

const CALL = () => globalState => {
  [
    gas,
    addr,
    value,
    argsOffset,
    argsLength,
    retOffset,
    retLength
  ] = globalState.callState.stack.slice(0, 7);

  let account = getAccount(addr);
  let callState = {
    ...callState(),
    code: account.code, //load destination Address
    caller: globalState.env.address, //
    callData: new Buffer(
      globalState.callState.memory.slice(argsOffset, argsOffset + argsLength)
    ), //load callData
    callValue: value, //load Call value
    depth: globalState.callState.depth + 1 //Increase depth
  };

  let env = {
    ...env(),
    address: addr,
    contract: account
  };
  state = {
    ...globalState,
    callState,
    env
  };
  let ret = step(state);
  const stack = [...globalState.callState.stack.slice(7)];
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: stack.concat(ret.callState.halt, new BN(ret.env.returnValue)),
      pc: globalState.callState.pc + 2
    }
  };
};

const RETURNOP = () => globalState => {
  [offset, length] = globalState.callState.stack.slice(0, 2);
  word = globalState.callState.memory.slice(offset, offseta + length);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: globalState.callState.stack.slice(2)
    },
    env: {
      ...globalState.callState.evn,
      returnValue: word
    }
  };
};

//const exampleInput =
//"60606040523415600e57600080fd5b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550603580605b6000396000f3006060604052600080fd00a165627a7a7230582056b";
const exampleInput = "60205100";
let initCallState = callState();
let buf1 = toBuffer(new BN("11"));
let buf2 = toBuffer(new BN("22"));
let buf3 = toBuffer(new BN("33"));
const Mem = buf1.concat(buf2);
let input = {
  ...globalState(),
  callState: { ...initCallState, code: exampleInput, memory: Mem }
};

const createVM = () => {
  return globalState();
};

console.log(step(input));

//console.log(step(input));
