
//ARITHMETIC
const ADD = (a,b) => (a + b);
const MUL = (a,b) => (a * b);
const SUB = (a,b) => (a - b);
const DIV = (a,b) => (a / b);
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


/**
module.exports = {
  STOP: function (runState) {
    runState.stopped = true
  },
  SDIV: function (runState) {
    let [a, b] = runState.stack.popN(2)
    let r
    if (b.isZero()) {
      r = new BN(b)
    } else {
      a = a.fromTwos(256)
      b = b.fromTwos(256)
      r = a.div(b).toTwos(256)
    }
    runState.stack.push(r)
  },
  SMOD: function (runState) {
    let [a, b] = runState.stack.popN(2)
    let r
    if (b.isZero()) {
      r = new BN(b)
    } else {
      a = a.fromTwos(256)
      b = b.fromTwos(256)
      r = a.abs().mod(b.abs())
      if (a.isNeg()) {
        r = r.ineg()
      }
      r = r.toTwos(256)
    }
    runState.stack.push(r)
  },
  ADDMOD: function (runState) {
    const [a, b, c] = runState.stack.popN(3)
    let r
    if (c.isZero()) {
      r = new BN(c)
    } else {
      r = a.add(b).mod(c)
    }
    runState.stack.push(r)
  },
  MULMOD: function (runState) {
    const [a, b, c] = runState.stack.popN(3)
    let r
    if (c.isZero()) {
      r = new BN(c)
    } else {
      r = a.mul(b).mod(c)
    }
    runState.stack.push(r)
  },
  SIGNEXTEND: function (runState) {
    let [k, val] = runState.stack.popN(2)
    val = val.toArrayLike(Buffer, 'be', 32)
    var extendOnes = false

    if (k.lten(31)) {
      k = k.toNumber()

      if (val[31 - k] & 0x80) {
        extendOnes = true
      }

      // 31-k-1 since k-th byte shouldn't be modified
      for (var i = 30 - k; i >= 0; i--) {
        val[i] = extendOnes ? 0xff : 0
      }
    }

    runState.stack.push(new BN(val))
  },
  // 0x10 range - bit ops

  SLT: function (runState) {
    const [a, b] = runState.stack.popN(2)
    const r = new BN(a.fromTwos(256).lt(b.fromTwos(256)) ? 1 : 0)
    runState.stack.push(r)
  },
  SGT: function (runState) {
    const [a, b] = runState.stack.popN(2)
    const r = new BN(a.fromTwos(256).gt(b.fromTwos(256)) ? 1 : 0)
    runState.stack.push(r)
  },

  BYTE: function (runState) {
    const [pos, word] = runState.stack.popN(2)
    if (pos.gten(32)) {
      runState.stack.push(new BN(0))
      return
    }

    const r = new BN(word.shrn((31 - pos.toNumber()) * 8).andln(0xff))
    runState.stack.push(r)
  },
  SHL: function (runState) {
    const [a, b] = runState.stack.popN(2)
    if (!runState._common.gteHardfork('constantinople')) {
      trap(ERROR.INVALID_OPCODE)
    }
    if (a.gten(256)) {
      runState.stack.push(new BN(0))
      return
    }

    const r = b.shln(a.toNumber()).iand(utils.MAX_INTEGER)
    runState.stack.push(r)
  },
  SHR: function (runState) {
    const [a, b] = runState.stack.popN(2)
    if (!runState._common.gteHardfork('constantinople')) {
      trap(ERROR.INVALID_OPCODE)
    }
    if (a.gten(256)) {
      runState.stack.push(new BN(0))
      return
    }

    const r = b.shrn(a.toNumber())
    runState.stack.push(r)
  },
  SAR: function (runState) {
    const [a, b] = runState.stack.popN(2)
    if (!runState._common.gteHardfork('constantinople')) {
      trap(ERROR.INVALID_OPCODE)
    }

    let r
    const isSigned = b.testn(255)
    if (a.gten(256)) {
      if (isSigned) {
        r = new BN(utils.MAX_INTEGER)
      } else {
        r = new BN(0)
      }
      runState.stack.push(r)
      return
    }

    const c = b.shrn(a.toNumber())
    if (isSigned) {
      const shiftedOutWidth = 255 - a.toNumber()
      const mask = utils.MAX_INTEGER.shrn(shiftedOutWidth).shln(shiftedOutWidth)
      r = c.ior(mask)
    } else {
      r = c
    }
    runState.stack.push(r)
  },
  // 0x20 range - crypto
  SHA3: function (runState) {
    const [offset, length] = runState.stack.popN(2)
    subMemUsage(runState, offset, length)
    let data = Buffer.alloc(0)
    if (!length.isZero()) {
      data = runState.memory.read(offset.toNumber(), length.toNumber())
    }
    // copy fee
    subGas(runState, new BN(runState._common.param('gasPrices', 'sha3Word')).imul(length.divCeil(new BN(32))))
    const r = new BN(utils.keccak256(data))
    runState.stack.push(r)
  },
  // 0x30 range - closure state
  ADDRESS: function (runState) {
    runState.stack.push(new BN(runState.address))
  },
  BALANCE: function (runState, cb) {
    let address = runState.stack.pop()
    var stateManager = runState.stateManager
    // stack to address
    address = addressToBuffer(address)

    // shortcut if current account
    if (address.toString('hex') === runState.address.toString('hex')) {
      runState.stack.push(new BN(runState.contract.balance))
      cb(null)
      return
    }

    // otherwise load account then return balance
    stateManager.getAccount(address, function (err, account) {
      if (err) {
        return cb(err)
      }
      runState.stack.push(new BN(account.balance))
      cb(null)
    })
  },
  ORIGIN: function (runState) {
    runState.stack.push(new BN(runState.origin))
  },
  CALLER: function (runState) {
    runState.stack.push(new BN(runState.caller))
  },
  CALLVALUE: function (runState) {
    runState.stack.push(new BN(runState.callValue))
  },
  CALLDATALOAD: function (runState) {
    let pos = runState.stack.pop()
    let r
    if (pos.gtn(runState.callData.length)) {
      r = new BN(0)
    } else {
      pos = pos.toNumber()
      var loaded = runState.callData.slice(pos, pos + 32)
      loaded = loaded.length ? loaded : Buffer.from([0])
      r = new BN(utils.setLengthRight(loaded, 32))
    }
    runState.stack.push(r)
  },
  CALLDATASIZE: function (runState) {
    let r
    if (runState.callData.length === 1 && runState.callData[0] === 0) {
      r = new BN(0)
    } else {
      r = new BN(runState.callData.length)
    }
    runState.stack.push(r)
  },
  CALLDATACOPY: function (runState) {
    let [memOffset, dataOffset, dataLength] = runState.stack.popN(3)

    subMemUsage(runState, memOffset, dataLength)
    subGas(runState, new BN(runState._common.param('gasPrices', 'copy')).imul(dataLength.divCeil(new BN(32))))

    const data = getDataSlice(runState.callData, dataOffset, dataLength)
    memOffset = memOffset.toNumber()
    dataLength = dataLength.toNumber()
    runState.memory.extend(memOffset, dataLength)
    runState.memory.write(memOffset, dataLength, data)
  },
  CODESIZE: function (runState) {
    runState.stack.push(new BN(runState.code.length))
  },
  CODECOPY: function (runState) {
    let [memOffset, codeOffset, length] = runState.stack.popN(3)

    subMemUsage(runState, memOffset, length)
    subGas(runState, new BN(runState._common.param('gasPrices', 'copy')).imul(length.divCeil(new BN(32))))

    const data = getDataSlice(runState.code, codeOffset, length)
    memOffset = memOffset.toNumber()
    length = length.toNumber()
    runState.memory.extend(memOffset, length)
    runState.memory.write(memOffset, length, data)
  },
  EXTCODESIZE: function (runState, cb) {
    let address = runState.stack.pop()
    var stateManager = runState.stateManager
    address = addressToBuffer(address)
    stateManager.getContractCode(address, function (err, code) {
      if (err) return cb(err)
      runState.stack.push(new BN(code.length))
      cb(null)
    })
  },
  EXTCODECOPY: function (runState, cb) {
    let [address, memOffset, codeOffset, length] = runState.stack.popN(4)

    var stateManager = runState.stateManager
    address = addressToBuffer(address)

    // FIXME: for some reason this must come before subGas
    subMemUsage(runState, memOffset, length)
    // copy fee
    subGas(runState, new BN(runState._common.param('gasPrices', 'copy')).imul(length.divCeil(new BN(32))))

    stateManager.getContractCode(address, function (err, code) {
      if (err) return cb(err)
      const data = getDataSlice(code, codeOffset, length)
      memOffset = memOffset.toNumber()
      length = length.toNumber()
      runState.memory.extend(memOffset, length)
      runState.memory.write(memOffset, length, data)

      cb(null)
    })
  },
  EXTCODEHASH: function (runState, cb) {
    let address = runState.stack.pop()
    if (!runState._common.gteHardfork('constantinople')) {
      trap(ERROR.INVALID_OPCODE)
    }
    var stateManager = runState.stateManager
    address = addressToBuffer(address)

    stateManager.getAccount(address, function (err, account) {
      if (err) return cb(err)

      if (account.isEmpty()) {
        runState.stack.push(new BN(0))
        return cb(null)
      }

      stateManager.getContractCode(address, function (err, code) {
        if (err) return cb(err)
        if (code.length === 0) {
          runState.stack.push(new BN(utils.KECCAK256_NULL))
          return cb(null)
        }

        runState.stack.push(new BN(utils.keccak256(code)))
        return cb(null)
      })
    })
  },
  RETURNDATASIZE: function (runState) {
    runState.stack.push(new BN(runState.lastReturned.length))
  },
  RETURNDATACOPY: function (runState) {
    let [memOffset, returnDataOffset, length] = runState.stack.popN(3)

    if ((returnDataOffset.add(length)).gtn(runState.lastReturned.length)) {
      trap(ERROR.OUT_OF_GAS)
    }

    subMemUsage(runState, memOffset, length)
    subGas(runState, new BN(runState._common.param('gasPrices', 'copy')).mul(length.divCeil(new BN(32))))

    const data = getDataSlice(utils.toBuffer(runState.lastReturned), returnDataOffset, length)
    memOffset = memOffset.toNumber()
    length = length.toNumber()
    runState.memory.extend(memOffset, length)
    runState.memory.write(memOffset, length, data)
  },
  GASPRICE: function (runState) {
    runState.stack.push(new BN(runState.gasPrice))
  },
  // '0x40' range - block operations
  BLOCKHASH: function (runState, cb) {
    const number = runState.stack.pop()
    var blockchain = runState.blockchain
    var diff = new BN(runState.block.header.number).sub(number)

    // block lookups must be within the past 256 blocks
    if (diff.gtn(256) || diff.lten(0)) {
      runState.stack.push(new BN(0))
      cb(null)
      return
    }

    blockchain.getBlock(number, function (err, block) {
      if (err) return cb(err)
      const blockHash = new BN(block.hash())
      runState.stack.push(blockHash)
      cb(null)
    })
  },
  COINBASE: function (runState) {
    runState.stack.push(new BN(runState.block.header.coinbase))
  },
  TIMESTAMP: function (runState) {
    runState.stack.push(new BN(runState.block.header.timestamp))
  },
  NUMBER: function (runState) {
    runState.stack.push(new BN(runState.block.header.number))
  },
  DIFFICULTY: function (runState) {
    runState.stack.push(new BN(runState.block.header.difficulty))
  },
  GASLIMIT: function (runState) {
    runState.stack.push(new BN(runState.block.header.gasLimit))
  },
  // 0x50 range - 'storage' and execution
  POP: function (runState) {
    runState.stack.pop()
  },
  MLOAD: function (runState) {
    const pos = runState.stack.pop()
    subMemUsage(runState, pos, new BN(32))
    const word = runState.memory.read(pos.toNumber(), 32)
    runState.stack.push(new BN(word))
  },
  MSTORE: function (runState) {
    let [offset, word] = runState.stack.popN(2)
    word = word.toArrayLike(Buffer, 'be', 32)
    subMemUsage(runState, offset, new BN(32))
    offset = offset.toNumber()
    runState.memory.extend(offset, 32)
    runState.memory.write(offset, 32, word)
  },
  MSTORE8: function (runState) {
    let [offset, byte] = runState.stack.popN(2)

    // NOTE: we're using a 'trick' here to get the least significant byte
    byte = Buffer.from([ byte.andln(0xff) ])
    subMemUsage(runState, offset, new BN(1))
    offset = offset.toNumber()
    runState.memory.extend(offset, 1)
    runState.memory.write(offset, 1, byte)
  },
  SLOAD: function (runState, cb) {
    let key = runState.stack.pop()
    var stateManager = runState.stateManager
    key = key.toArrayLike(Buffer, 'be', 32)

    stateManager.getContractStorage(runState.address, key, function (err, value) {
      if (err) return cb(err)
      value = value.length ? new BN(value) : new BN(0)
      runState.stack.push(value)
      cb(null)
    })
  },
  SSTORE: function (runState, cb) {
    if (runState.static) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }

    let [key, val] = runState.stack.popN(2)

    var stateManager = runState.stateManager
    var address = runState.address
    key = key.toArrayLike(Buffer, 'be', 32)
    // NOTE: this should be the shortest representation
    var value
    if (val.isZero()) {
      value = Buffer.from([])
    } else {
      value = val.toArrayLike(Buffer, 'be')
    }

    getContractStorage(runState, address, key, function (err, found) {
      if (err) return cb(err)
      try {
        updateSstoreGas(runState, found, value)
      } catch (e) {
        cb(e.error)
        return
      }

      stateManager.putContractStorage(address, key, value, function (err) {
        if (err) return cb(err)
        stateManager.getAccount(address, function (err, account) {
          if (err) return cb(err)
          runState.contract = account
          cb(null)
        })
      })
    })
  },
  JUMP: function (runState) {
    let dest = runState.stack.pop()
    if (dest.gtn(runState.code.length)) {
      trap(ERROR.INVALID_JUMP + ' at ' + describeLocation(runState))
    }

    dest = dest.toNumber()

    if (!jumpIsValid(runState, dest)) {
      trap(ERROR.INVALID_JUMP + ' at ' + describeLocation(runState))
    }

    runState.programCounter = dest
  },
  JUMPI: function (runState) {
    let [dest, cond] = runState.stack.popN(2)
    if (!cond.isZero()) {
      if (dest.gtn(runState.code.length)) {
        trap(ERROR.INVALID_JUMP + ' at ' + describeLocation(runState))
      }

      dest = dest.toNumber()

      if (!jumpIsValid(runState, dest)) {
        trap(ERROR.INVALID_JUMP + ' at ' + describeLocation(runState))
      }

      runState.programCounter = dest
    }
  },
  PC: function (runState) {
    runState.stack.push(new BN(runState.programCounter - 1))
  },
  MSIZE: function (runState) {
    runState.stack.push(runState.memoryWordCount.muln(32))
  },
  GAS: function (runState) {
    runState.stack.push(new BN(runState.gasLeft))
  },
  JUMPDEST: function (runState) {},
  PUSH: function (runState) {
    const numToPush = runState.opCode - 0x5f
    const loaded = new BN(runState.code.slice(runState.programCounter, runState.programCounter + numToPush).toString('hex'), 16)
    runState.programCounter += numToPush
    runState.stack.push(loaded)
  },
  DUP: function (runState) {
    const stackPos = runState.opCode - 0x7f
    runState.stack.dup(stackPos)
  },
  SWAP: function (runState) {
    const stackPos = runState.opCode - 0x8f
    runState.stack.swap(stackPos)
  },
  LOG: function (runState) {
    if (runState.static) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }

    let [memOffset, memLength] = runState.stack.popN(2)

    const topicsCount = runState.opCode - 0xa0
    if (topicsCount < 0 || topicsCount > 4) {
      trap(ERROR.OUT_OF_RANGE)
    }

    let topics = runState.stack.popN(topicsCount)
    topics = topics.map(function (a) {
      return a.toArrayLike(Buffer, 'be', 32)
    })

    const numOfTopics = runState.opCode - 0xa0
    subMemUsage(runState, memOffset, memLength)
    let mem = Buffer.alloc(0)
    if (!memLength.isZero()) {
      mem = runState.memory.read(memOffset.toNumber(), memLength.toNumber())
    }
    subGas(runState, new BN(runState._common.param('gasPrices', 'logTopic')).imuln(numOfTopics).iadd(memLength.muln(runState._common.param('gasPrices', 'logData'))))

    // add address
    var log = [runState.address]
    log.push(topics)

    // add data
    log.push(mem)
    runState.logs.push(log)
  },

  // '0xf0' range - closures
  CREATE: function (runState, done) {
    if (runState.static) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }

    const [value, offset, length] = runState.stack.popN(3)

    subMemUsage(runState, offset, length)
    let data = Buffer.alloc(0)
    if (!length.isZero()) {
      data = runState.memory.read(offset.toNumber(), length.toNumber())
    }

    // set up config
    var options = {
      value: value,
      data: data
    }

    var localOpts = {
      inOffset: offset,
      inLength: length,
      outOffset: new BN(0),
      outLength: new BN(0)
    }

    checkCallMemCost(runState, options, localOpts)
    checkOutOfGas(runState, options)
    makeCall(runState, options, localOpts, done)
  },
  CREATE2: function (runState, done) {
    if (!runState._common.gteHardfork('constantinople')) {
      trap(ERROR.INVALID_OPCODE)
    }

    if (runState.static) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }

    const [value, offset, length, salt] = runState.stack.popN(4)

    subMemUsage(runState, offset, length)
    let data = Buffer.alloc(0)
    if (!length.isZero()) {
      data = runState.memory.read(offset.toNumber(), length.toNumber())
    }

    // set up config
    var options = {
      value: value,
      data: data,
      salt: salt.toArrayLike(Buffer, 'be', 32)
    }

    var localOpts = {
      inOffset: offset,
      inLength: length,
      outOffset: new BN(0),
      outLength: new BN(0)
    }

    // Deduct gas costs for hashing
    subGas(runState, new BN(runState._common.param('gasPrices', 'sha3Word')).imul(length.divCeil(new BN(32))))
    checkCallMemCost(runState, options, localOpts)
    checkOutOfGas(runState, options)
    makeCall(runState, options, localOpts, done)
  },
  CALL: function (runState, done) {
    var stateManager = runState.stateManager

    let [gasLimit, toAddress, value, inOffset, inLength, outOffset, outLength] = runState.stack.popN(7)
    toAddress = addressToBuffer(toAddress)

    if (runState.static && !value.isZero()) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }

    subMemUsage(runState, inOffset, inLength)
    let data = Buffer.alloc(0)
    if (!inLength.isZero()) {
      data = runState.memory.read(inOffset.toNumber(), inLength.toNumber())
    }

    var options = {
      gasLimit: gasLimit,
      value: value,
      to: toAddress,
      data: data,
      static: runState.static
    }

    var localOpts = {
      inOffset: inOffset,
      inLength: inLength,
      outOffset: outOffset,
      outLength: outLength
    }

    if (!value.isZero()) {
      subGas(runState, new BN(runState._common.param('gasPrices', 'callValueTransfer')))
    }

    stateManager.accountIsEmpty(toAddress, function (err, empty) {
      if (err) {
        done(err)
        return
      }

      if (empty) {
        if (!value.isZero()) {
          try {
            subGas(runState, new BN(runState._common.param('gasPrices', 'callNewAccount')))
          } catch (e) {
            done(e.error)
            return
          }
        }
      }

      try {
        checkCallMemCost(runState, options, localOpts)
        checkOutOfGas(runState, options)
      } catch (e) {
        done(e.error)
        return
      }

      if (!value.isZero()) {
        runState.gasLeft.iaddn(runState._common.param('gasPrices', 'callStipend'))
        options.gasLimit.iaddn(runState._common.param('gasPrices', 'callStipend'))
      }

      makeCall(runState, options, localOpts, done)
    })
  },
  CALLCODE: function (runState, done) {
    var stateManager = runState.stateManager
    let [gas, toAddress, value, inOffset, inLength, outOffset, outLength] = runState.stack.popN(7)
    toAddress = addressToBuffer(toAddress)

    subMemUsage(runState, inOffset, inLength)
    let data = Buffer.alloc(0)
    if (!inLength.isZero()) {
      data = runState.memory.read(inOffset.toNumber(), inLength.toNumber())
    }

    const options = {
      gasLimit: gas,
      value: value,
      data: data,
      to: runState.address,
      static: runState.static
    }

    const localOpts = {
      inOffset: inOffset,
      inLength: inLength,
      outOffset: outOffset,
      outLength: outLength
    }

    if (!value.isZero()) {
      subGas(runState, new BN(runState._common.param('gasPrices', 'callValueTransfer')))
    }

    checkCallMemCost(runState, options, localOpts)
    checkOutOfGas(runState, options)

    if (!value.isZero()) {
      runState.gasLeft.iaddn(runState._common.param('gasPrices', 'callStipend'))
      options.gasLimit.iaddn(runState._common.param('gasPrices', 'callStipend'))
    }

    // load the code
    stateManager.getAccount(toAddress, function (err, account) {
      if (err) return done(err)
      if (runState._precompiled[toAddress.toString('hex')]) {
        options.compiled = true
        options.code = runState._precompiled[toAddress.toString('hex')]
        makeCall(runState, options, localOpts, done)
      } else {
        stateManager.getContractCode(toAddress, function (err, code, compiled) {
          if (err) return done(err)
          options.compiled = compiled || false
          options.code = code
          makeCall(runState, options, localOpts, done)
        })
      }
    })
  },
  DELEGATECALL: function (runState, done) {
    var stateManager = runState.stateManager
    var value = runState.callValue
    let [gas, toAddress, inOffset, inLength, outOffset, outLength] = runState.stack.popN(6)
    toAddress = addressToBuffer(toAddress)

    subMemUsage(runState, inOffset, inLength)
    let data = Buffer.alloc(0)
    if (!inLength.isZero()) {
      data = runState.memory.read(inOffset.toNumber(), inLength.toNumber())
    }

    const options = {
      gasLimit: gas,
      value: value,
      data: data,
      to: runState.address,
      caller: runState.caller,
      delegatecall: true,
      static: runState.static
    }

    const localOpts = {
      inOffset: inOffset,
      inLength: inLength,
      outOffset: outOffset,
      outLength: outLength
    }

    checkCallMemCost(runState, options, localOpts)
    checkOutOfGas(runState, options)

    // load the code
    stateManager.getAccount(toAddress, function (err, account) {
      if (err) return done(err)
      if (runState._precompiled[toAddress.toString('hex')]) {
        options.compiled = true
        options.code = runState._precompiled[toAddress.toString('hex')]
        makeCall(runState, options, localOpts, done)
      } else {
        stateManager.getContractCode(toAddress, function (err, code, compiled) {
          if (err) return done(err)
          options.compiled = compiled || false
          options.code = code
          makeCall(runState, options, localOpts, done)
        })
      }
    })
  },
  STATICCALL: function (runState, done) {
    var value = new BN(0)
    let [gasLimit, toAddress, inOffset, inLength, outOffset, outLength] = runState.stack.popN(6)
    toAddress = addressToBuffer(toAddress)

    subMemUsage(runState, inOffset, inLength)
    let data = Buffer.alloc(0)
    if (!inLength.isZero()) {
      data = runState.memory.read(inOffset.toNumber(), inLength.toNumber())
    }

    var options = {
      gasLimit: gasLimit,
      value: value,
      to: toAddress,
      data: data,
      static: true
    }

    var localOpts = {
      inOffset: inOffset,
      inLength: inLength,
      outOffset: outOffset,
      outLength: outLength
    }

    try {
      checkCallMemCost(runState, options, localOpts)
      checkOutOfGas(runState, options)
    } catch (e) {
      done(e.error)
      return
    }

    makeCall(runState, options, localOpts, done)
  },
  RETURN: function (runState) {
    const [offset, length] = runState.stack.popN(2)
    subMemUsage(runState, offset, length)
    runState.returnValue = Buffer.alloc(0)
    if (!length.isZero()) {
      runState.returnValue = runState.memory.read(offset.toNumber(), length.toNumber())
    }
  },
  REVERT: function (runState) {
    const [offset, length] = runState.stack.popN(2)
    runState.stopped = true
    subMemUsage(runState, offset, length)
    runState.returnValue = Buffer.alloc(0)
    if (!length.isZero()) {
      runState.returnValue = runState.memory.read(offset.toNumber(), length.toNumber())
    }
    trap(ERROR.REVERT)
  },
  // '0x70', range - other
  SELFDESTRUCT: function (runState, cb) {
    let selfdestructToAddress = runState.stack.pop()
    if (runState.static) {
      trap(ERROR.STATIC_STATE_CHANGE)
    }
    var stateManager = runState.stateManager
    var contract = runState.contract
    var contractAddress = runState.address
    selfdestructToAddress = addressToBuffer(selfdestructToAddress)

    stateManager.getAccount(selfdestructToAddress, function (err, toAccount) {
      // update balances
      if (err) {
        cb(err)
        return
      }

      stateManager.accountIsEmpty(selfdestructToAddress, function (error, empty) {
        if (error) {
          cb(error)
          return
        }

        if ((new BN(contract.balance)).gtn(0)) {
          if (empty) {
            try {
              subGas(runState, new BN(runState._common.param('gasPrices', 'callNewAccount')))
            } catch (e) {
              cb(e.error)
              return
            }
          }
        }

        // only add to refund if this is the first selfdestruct for the address
        if (!runState.selfdestruct[contractAddress.toString('hex')]) {
          runState.gasRefund = runState.gasRefund.addn(runState._common.param('gasPrices', 'selfdestructRefund'))
        }
        runState.selfdestruct[contractAddress.toString('hex')] = selfdestructToAddress
        runState.stopped = true

        var newBalance = new BN(contract.balance).add(new BN(toAccount.balance))
        async.waterfall([
          stateManager.getAccount.bind(stateManager, selfdestructToAddress),
          function (account, cb) {
            account.balance = newBalance
            stateManager.putAccount(selfdestructToAddress, account, cb)
          },
          stateManager.getAccount.bind(stateManager, contractAddress),
          function (account, cb) {
            account.balance = new BN(0)
            stateManager.putAccount(contractAddress, account, cb)
          }
        ], function (err) {
          // The reason for this is to avoid sending an array of results
          cb(err)
        })
      })
    })
  }
}
**/
