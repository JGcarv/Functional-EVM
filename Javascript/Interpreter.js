const BN = require("bn.js");
//import codes from "./Opcodes.js";
const uint256 = new BN(2).pow(new BN(256));

//Naive Implementation. It's not very performant
const globalState = () => {
  return {
    callState: callState(),
    subState: subState(),
    message: message(),
    txData: txData(),
    blockInfo: blockInfo(),
    accounts: {}
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

const message = () => {
  return {
    msgHash: "",
    txNonce: 0,
    txGasPrice: 0,
    txGasLimit: 0,
    to: account(),
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

// var t = new BN("3200000000000000000");
// let d1 = t.toArrayLike(Buffer, "be", 8);
// let d2 = t.toArrayLike(Buffer, "be", 8);
// console.log(d1.add(d2));

const getOp = (call, pc = call.pc) => {
  if (call.pc > call.code.length) {
    return "";
  }
  return parseInt(call.code[pc] + call.code[pc + 1], 16);
};

//The satck can be accept different values as long as opcodes deal with 256bit limitation
const addToStack = (stack, value) => {
  return stack.concat(value);
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
  return step(executeStep(globalState));
}

//The execution of a single opcode. Returns a new callState
const executeStep = globalState => {
  const callState = { ...globalState.callState };

  let opcode = getOp(callState);
  //Maybe a switch statement
  if (opcode >= 0x60 && opcode <= 0x7f) {
    // TODO cleanup this
    let word = callState.code.substr(callState.pc + 2, opcode - 0x5e);
    let pc = callState.pc + (opcode - 0x5e) * 2;

    return {
      ...globalState,
      callState: {
        ...callState,
        pc,
        stack: [...callState.stack, new BN(word)]
      }
    };
  }

  if (opcode == 0x56 || opcode == 0x57) {
    let dest = getOP(callState, callState.stack.pop());
    if (dest != 0x5b) {
      return "invalid JUMP";
    } else {
      //TODO deal with conditional JUMP
      return { ...callState, pc: dest };
    }
  }
  return codes(opcode)(globalState);
};

const codes = op => {
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
      return stateToStack(["message", "to", "address"]);
    case 0x33:
      return stateToStack(["callState", "caller"]);
    default:
      return errorState();
  }
};

const errorState = () => globalState => {
  return { ...globalState, callState: { ...callState, halt: true } };
};

const dupOp = op => {
  //pos = op - 7f
  //stack.concat(stack[stack.length - pos]);
};

const swapOp = op => {
  let pos = op - 0x8f;
  let head = stack[0];
  let temp = stack[stack.length - pos];
  stack[stack.length - pos] = head;
  stack[0] = temp;
};

const memRead = state => {
  let offset = state.stack[0];
  let stack = stack.concat(state.memory.slice(offset, offset + 32));
  return { ...state, satck };
};

//Not exactly how it's done, need so refactoring because MSTORE 8 appends 0xff bytes to reach 32
const memWrite = state => {
  let op = getOp(state);
  let len = op == 0x52 ? 32 : 8;
  let offset = state.stack[0];
  let value = new BN(stack.pop(), len);
  stack.slice(0, offset).concat([], stack.slice(offset + len));
};

//Read `item` form globalState and add it to the stack
const stateToStack = path => globalState => {
  const item = path.reduce((acc, val, index) => {
    return acc[val];
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

//const exampleInput =
//"60606040523415600e57600080fd5b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550603580605b6000396000f3006060604052600080fd00a165627a7a7230582056b";
const exampleInput = "606060400133";
let initCallState = callState();

let input = {
  ...globalState(),
  callState: { ...initCallState, code: exampleInput }
};

console.log(stateToStack(["message", "to", "address"])(input));

//console.log(step(input));
