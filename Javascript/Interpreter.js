// const exampleInput = "60606040523415600e57600080fd5b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550603580605b6000396000f3006060604052600080fd00a165627a7a7230582056b"

let callState = {
  memory: [],
  stack: []
}

const exampleInput = "6060604001"
//var stack = [];


function parseBytecode(bytecode, callState) {
  let stack = callState.stack;
  let pc = 0;
  for(pc = 0; pc < bytecode.length; pc = pc+2){
    let opcode = parseInt(bytecode.substr(pc,2), 16)
      //Push Opcode
      if(opcode >= 96 && opcode <= 127 ){
        let amountToPush = (opcode - 95) * 2
        let word = bytecode.substr(pc + 2, amountToPush)
        pc = pc + amountToPush
        stack.push(word);
      //Jump opcode
    }
      else if (opcode == 0x56 || opcode == 0x57) {
        //jump and increase pc
        let dest = stack.pop()
        pc = dest;
      }
      else {
        executeOpcode(opcode, stack);
    }
  }
}

function executeOpcode(op, stack) {
  codes[op](stack);
  console.log(stack);

}

const stackOp2 = op => stack => {
    let elem1 = stack.pop();
    let elem2 = stack.pop();
    stack.push(op(elem1,elem2))
    return stack;
}

//ARITHMETIC
const ADD = (a,b) => a + b;
const MUL = (a,b) => a * b;
const SUB = (a,b) => a - b;
const DIV = (a,b) => a / b;
const EXP = (a,b) => a ** b;
const MOD = (a,b) => a % b;

// COMPARISSON
const LT = (a,b) => a < b;
const GT = (a,b) => a > b;
const EQ = (a,b) => a == b;
const ISZERO = (a) => a == 0;

//BIT
const AND = (a,b) => a & b;
const OR = (a,b) => a | b;
const XOR = (a,b) => a ^ b;
const NOT = (a) => ~a;

const codes = {
  0x01: stackOp2(ADD),
  0x02: stackOp2(MUL),
  0x03: stackOp2(SUB),
  0x04: stackOp2(DIV),
}

console.log(parseBytecode(exampleInput, {memory: [], stack:[]}));
