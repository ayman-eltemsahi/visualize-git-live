/* eslint no-bitwise: 0 */

// const logDebug = require('debug')('log');
// const errorDebug = require('debug')('error');
const C = require('../constants');

function fourBytesToInt(bytes) {
  return bytes[3] | (bytes[2] << 8) | (bytes[1] << 16) | (bytes[0] << 24);
}

function byteToBinary(byte) {
  return [
    (byte >> 7) & 1,
    (byte >> 6) & 1,
    (byte >> 5) & 1,
    (byte >> 4) & 1,
    (byte >> 3) & 1,
    (byte >> 2) & 1,
    (byte >> 1) & 1,
    (byte >> 0) & 1,
  ];
}

function toBinary(data) {
  const bin = [];

  data.forEach(ch => bin.push(...byteToBinary(ch)));

  return bin;
}

function toHex(data) {
  let h = '';
  data.map(Number).forEach(d => {
    h += (d < 16) ? (`0${d.toString('16')}`) : d.toString('16');
  });

  return h;
}

function getCallBackByType(type) {
  switch (type) {
    case C.STRING:
      return e => e.toString();
    case C.HEX:
      return toHex;
    case C.NUMBER:
      return fourBytesToInt;
    case C.BIN:
      return toBinary;

    default:
      return e => e;
  }
}

function getReader(data, index = 0) {
  let previousIndex = -1;
  function pre(options) {
    previousIndex = undefined;

    if (options && options.peek) {
      previousIndex = index;
    }
  }

  function post(options) {
    if (options && options.peek) {
      index = previousIndex;
    }
  }

  function nextByte() {
    return data[index++];
  }

  function next(numberOfBytes, type, options) {
    pre(options);

    const cb = getCallBackByType(type);
    const nextIndex = index + numberOfBytes;
    const ret = data.slice(index, nextIndex);

    index = nextIndex;

    post(options);

    return cb(ret);
  }

  function nextUntil(char, type, options) {
    pre(options);

    const cb = getCallBackByType(type);
    let nextIndex = index;

    let maxIndex = data.length;
    if (options && options.maxLength) {
      maxIndex = nextIndex + options.maxLength;
    }

    while (nextIndex < maxIndex && data[nextIndex] !== char) {
      ++nextIndex;
    }

    let ret = data.slice(index, nextIndex);
    ret = cb(ret);

    index = nextIndex + 1;

    post(options);

    return cb(ret);
  }

  function toEnd(type, options) {
    return next(data.length - index, type, options);
  }

  function getIndex() {
    return index;
  }

  function skip(number) {
    index += number;
  }

  function skipUntil(char) {
    while (index < data.length && data[index] !== char) {
      ++index;
    }
    ++index;
  }

  function remaining() {
    return Math.max(0, data.length - index);
  }

  return {
    next,
    getIndex,
    nextUntil,
    skip,
    skipUntil,
    toEnd,
    remaining,
    nextByte,
  };
}

module.exports = {
  getReader,
};
