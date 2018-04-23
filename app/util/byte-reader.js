const logDebug = require('debug')('log');
const errorDebug = require('debug')('error');
const C = require('../constants');

function four_bytes_to_int(bytes) {
    return bytes[3] | (bytes[2] << 8) | (bytes[1] << 16) | (bytes[0] << 24);
}

function byte_to_binary(byte) {
    return [
        ( byte >> 7 ) & 1,
        ( byte >> 6 ) & 1,
        ( byte >> 5 ) & 1,
        ( byte >> 4 ) & 1,
        ( byte >> 3 ) & 1,
        ( byte >> 2 ) & 1,
        ( byte >> 1 ) & 1,
        ( byte >> 0 ) & 1
    ]
}

function toBinary(data) {
    var bin = [];
   
    data.forEach(ch => bin.push(...byte_to_binary(ch)) );

    return bin;
}

function to_hex(data) {
    let h = '';
    for (let d of data.map(Number)) {
        h += (d < 16) ? ('0' + d.toString('16')) : d.toString('16');
    }
    return h;
}

function getCallBackByType(type) {
    var cb;
    if (type === C.STRING) {
        cb = e => e.toString();
    } else if (type === C.HEX) {
        cb = to_hex;
    } else if (type === C.NUMBER) {
        cb = four_bytes_to_int;
    } else if (type === C.BIN) {
        cb = toBinary;
    } else {
        cb = e => e;
    }
    return cb;
}



function getReader(data, index) {
    index = index || 0;

    var previousIndex = -1;
    function pre(options) {
        previousIndex = void 0;

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

        var cb = getCallBackByType(type);
        let nextIndex = index + numberOfBytes;
        let ret = data.slice(index, nextIndex);

        index = nextIndex;

        post(options);

        return cb(ret);
    }

    function nextUntil(char, type, options) {
        pre(options);

        var cb = getCallBackByType(type);
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
        nextByte
    }
}


module.exports = {
    getReader
}