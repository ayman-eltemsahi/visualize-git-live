/* eslint no-bitwise: off */
// https://github.com/git/git/blob/master/Documentation/technical/pack-format.txt

const { readFile } = require('fs').promises;
const debug = require('debug');
const zipped = require('./zipped');
const byteReader = require('./util/byte-reader');

const config = require('../config');
const C = require('./constants');

function readPackIdx(path) {
  return readFile(`${path}.idx`)
    .then(data => {
      const mem = byteReader.getReader(data);

      // A 4-byte magic number \377tOc which is an unreasonable fanout[0] value.
      mem.next(4, C.HEX);

      // A 4-byte version number (= 2)
      /* const version = */ mem.next(4, C.NUMBER);

      // A 256-entry fan-out table
      const fanoutTable = [];
      let ObjectsCount;
      for (let i = 0; i < 256; i++) {
        ObjectsCount = mem.next(4, C.NUMBER);
        fanoutTable.push(ObjectsCount);
      }

      // a list of all the objects
      const objects = [];
      for (let i = 0; i < ObjectsCount; i++) objects.push({});

      /*
          A table of sorted 20-byte SHA-1 object names. These are packed together without offset values to
          reduce the cache footprint of the binary search for a specific object name.
      */
      for (let i = 0; i < ObjectsCount; i++) {
        // console.log(mem.next(20, C.HEX, { peek: true }));
        objects[i].sha = mem.next(20, C.HEX);
      }

      /*
          A table of 4-byte CRC32 values of the packed object data. This is new in v2 so compressed data can be
          copied directly from pack to pack during repacking without undetected data corruption.
      */
      for (let i = 0; i < ObjectsCount; i++) {
        mem.skip(4);
      }

      /*
          A table of 4-byte offset values (in network byte order). These are usually 31-bit pack file offsets, but
          large offsets are encoded as an index into the next table with the msbit set.
      */
      for (let i = 0; i < ObjectsCount; i++) {
        objects[i].offset = mem.next(4, C.NUMBER);
      }

      return readPack(path, objects);
    });
}

function readPack(path, objects) {
  return readFile(`${path}.pack`)
    .then(data => {
      const mem = byteReader.getReader(data);

      // 4-byte signature:
      mem.next(4);

      // 4-byte version number (network byte order):
      /* const version = */ mem.next(4, C.NUMBER);

      // 4-byte number of objects contained in the pack (network byte order)
      const objectsCount = mem.next(4, C.NUMBER);

      debug('tree:pack-objects-count')(objectsCount);

      if (objectsCount > config.maxNumberOfObjects) {
        throw new Error('TOO_MANY_OBJECTS');
      }

      const unzipPromises = [];

      objects.forEach(obj => {
        const { offset } = obj;

        /*
            packed object header:
                1-byte size extension bit (MSB)
                    type (next 3 bit)
                    size0 (lower 4-bit)
                n-byte sizeN (as long as MSB is set, each 7-bit)
                    size0..sizeN form 4+7+7+..+7 bit integer, size0
                    is the least significant part, and sizeN is the
                    most significant part.
         */
        const headerSize = getObjectHeaderSize(data, offset);
        const type = getObjectType(data, offset);

        obj.type = type;

        let readIndex = offset + headerSize;
        if (type === C.OFS_DELTA) {
          const byteLen = getObjectHeaderSize(data, offset + headerSize);

          readIndex += byteLen;
          // n-byte offset interpreted as a negative offset from the type-byte
          // of the header of the ofs-delta entry
          const ofsDelta = getOffsetDelta(data, offset + headerSize, byteLen);
          obj.ofs_delta = ofsDelta;
        }

        unzipPromises.push(zipped.unzip(data.slice(readIndex)).then(buf => { obj.data = buf; }));
      });

      return Promise.all(unzipPromises).catch(debug('tree:unzip'));
    })
    .then(() => {
      const offsetIndexMap = new Map();
      objects.forEach(obj => offsetIndexMap.set(obj.offset, obj));

      /*
       * - parse the current objects, and if an object is diffed as well as its parent,
       *   then postpone it till the next loop until its base object has been restored.
       * - if each time, only half the objects are restored, then it will take O(2n) = O(n).
       */
      let remaining = objects;
      while (remaining.length) {
        debug('tree:remaining.length')(remaining.length);
        const nextRun = [];

        remaining.forEach(obj => {
          if (obj.type === C.OFS_DELTA) {
            const baseObject = offsetIndexMap.get(obj.offset - obj.ofs_delta);
            if (!baseObject) {
              return debug('tree:no_base_object')(obj);
            }

            if (baseObject.type === C.OFS_DELTA) {
              return nextRun.push(obj);
            }

            const sourceLength = getObjectHeaderSize(obj.data, 0);
            const targetLength = getObjectHeaderSize(obj.data, sourceLength);

            const mem = byteReader.getReader(obj.data, sourceLength + targetLength);
            const restoredData = restoreDataFromDiff(mem, baseObject.data);

            obj.data = restoredData;
            obj.type = baseObject.type;
          }
        }); /* end remaining.forEach */

        remaining = nextRun;
      }

      return objects;
    });
}

function getObjectHeaderSize(data, index) {
  let size = 1;
  let currentIndex = index;

  while (data[currentIndex] & (1 << 7)) {
    size++;
    currentIndex++;
  }

  return size;
}

function getObjectType(data, index) {
  return (data[index] >> 4) & (~(1 << 3));
}

function restoreDataFromDiff(mem, baseObject) {
  const restoredData = [];
  while (mem.remaining() && restoredData.length <= 5 * config.maxKeepFileSize) {
    const firstByte = mem.nextByte();
    const op = (firstByte >> 7) & 1; /* first bit */

    if (op === C.INSERT) {
      const copyLength = firstByte & (~(1 << 7));
      restoredData.push(...mem.next(copyLength));
    } else if (op === C.COPY) {
      const copyOffset = getCopyOffset(firstByte, mem);
      const copyLength = getCopyLength(firstByte, mem);

      restoredData.push(...baseObject.slice(copyOffset, copyOffset + copyLength));
    }
  }

  return Buffer.from(restoredData);
}

function getOffsetDelta(data, offset, len) {
  /*
    n bytes with MSB set in all but the last one.
    The offset is then the number constructed by
    concatenating the lower 7 bit of each byte, and
    for n >= 2 adding 2^7 + 2^14 + ... + 2^(7*(n-1))
    to the result.
  */

  let num = 0;
  let currentLen = len;
  let currentOffset = offset;
  while (currentLen--) {
    const bin = data[currentOffset++] & (~(1 << 7)); /* remove the MSB bit */

    num <<= 7;
    num |= bin;
  }

  if (len >= 2) {
    for (let i = 1; i < len; i++) {
      num += 1 << (7 * (len - i));
    }
  }

  return num;
}

function getCopyOffset(binary, mem) {
  let result = 0;

  if (binary & (1 << 3)) result |= (mem.nextByte() << 24);
  if (binary & (1 << 2)) result |= (mem.nextByte() << 16);
  if (binary & (1 << 1)) result |= (mem.nextByte() << 8);
  if (binary & (1 << 0)) result |= (mem.nextByte());

  return result;
}

function getCopyLength(binary, mem) {
  let result = 0;

  if (binary & (1 << 6)) result |= (mem.nextByte() << 16);
  if (binary & (1 << 5)) result |= (mem.nextByte() << 8);
  if (binary & (1 << 4)) result |= (mem.nextByte());

  return result;
}

module.exports = {
  read: readPackIdx,
};
