const BN = require("bn.js");
// const exampleInput = "60606040523415600e57600080fd5b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550603580605b6000396000f3006060604052600080fd00a165627a7a7230582056b"
const callState = {
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
  depth: 0
};
const subState = {
  selfDestruct: false,
  log: "",
  refund: 0
};

const txData = {
  gasprice: 0,
  origin: ""
};

const blockInfo = {
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

// var t = new BN("320000000000000000");
// console.log(t.toArrayLike(Buffer, "be", 8));

const exampleInput = "6060604001";
//var stack = [];

// function parseBytecode(callState) {
//   let stack = callState.stack;
//   let bytecode = callState.code;
//   let pc = 0;
//   for(pc = 0; pc < bytecode.length; pc = pc+2){
//     let opcode = parseInt(bytecode.substr(pc,2), 16)
//       //Push Opcode
//       if(opcode >= 0x60 && opcode <= 0x7f ){
//         let amountToPush = (opcode - 95) * 2
//         let word = bytecode.substr(pc + 2, amountToPush)
//         pc = pc + amountToPush
//         console.log(word);
//         addToStack(stack, new BN(word));
//       //Jump opcode
//     }
//       else if (opcode == 0x56 || opcode == 0x57) {
//         //jump and increase pc
//         let dest = stack.pop()
//         pc = dest;
//       }
//       else {
//         executeOpcode(opcode, stack);
//     }
//   }
// }

const getOp = (call, pc = call.pc) => {
  if (call.code[pc] > call.code.length) {
    return "";
  }
  return parseInt(call.code[pc] + call.code[pc + 1], 16);
};

//The satck can be accept different values as long as opcodes deal with 256bit limitation
const addToStack = (stack, value) => {
  return stack.concat(value);
};

// function step(callState) {
//   //lookup next opcode
//   let opcode = getOp(call);
//   //STOP if
//   if(opcode == "" || opcode == 0) {
//     //halting mechaninc
//     return callState;
//   }
//   // Check if there's enough gas

//   //Execute
//   step(executeStep(callState))
//}

//The execution of a single opcode. Returns a new callState
const executeStep = callState => {
  let opcode = getOp(callState);
  //Maybe a switch statement
  if (opcode >= 0x60 && opcode <= 0x7f) {
    // TODO cleanup this
    let word = callState.code.substr(callState.pc + 2);
    callState.pc = callState.pc + (opcode - 0x5f) * 2;
    // TODO deal with stack too deep
    return { ...callState, stack: addToStack(callState.stack, new BN(word)) };
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
  //Memory opcodes

  //Storage Opcodes

  //Stack opcodes

  executeOpcode(opcode, callState.stack);

  return { ...callState };
};

function executeOpcode(op, stack) {
  console.log(codes(op));
  codes(op)(stack);
  return stack;
}

const codes = op => {
  switch (op) {
    case 0x01:
      return stackOp2(ADD);
      break;
    case 0x02:
      return stackOp2(MUL);
      break;
    default:
      return "Op not implemented";
      break;
  }
  // 0x02: stackOp2(),
  // 0x03: stackOp2(SUB),
  // 0x04: stackOp2(DIV)
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

const stackOp2 = op => stack => {
  let elem1 = stack.pop();
  let elem2 = stack.pop();
  stack.push(op(elem1, elem2));
  return stack;
};

//ARITHMETIC
const ADD = (a, b) => a + b;
const MUL = (a, b) => a * b;
const SUB = (a, b) => a - b;
const DIV = (a, b) => a / b;
const EXP = (a, b) => a ** b;
const MOD = (a, b) => a % b;

// COMPARISSON
const LT = (a, b) => a < b;
const GT = (a, b) => a > b;
const EQ = (a, b) => a == b;
const ISZERO = a => a == 0;

//BIT
const AND = (a, b) => a & b;
const OR = (a, b) => a | b;
const XOR = (a, b) => a ^ b;
const NOT = a => ~a;

let input = { ...callState };
console.log(executeStep({ ...input, code: exampleInput }));

console.log(getOp({ code: exampleInput, pc: 0, memory: [], stack: [] }));
