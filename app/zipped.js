const zlib = require('zlib');
const debug = require('debug');
const pfs = require('./pfs');
const config = require('../config');

function readFileWithSize(path) {
  return pfs.readFileWithSize(path)
    .then(({ size, buffer: data }) => new Promise((resolve, reject) => {
      if (!data) return reject(data);

      return zlib.unzip(data, (err, buffer) => {
        if (err || !buffer) {
          return reject(err);
        }

        if (buffer.length <= config.maxKeepFileSize) {
          return resolve({ size, buffer });
        }

        const slicedBuffer = buffer.slice(0, config.maxKeepFileSize);
        for (let i = 0; i < 15; i++) {
          slicedBuffer.write('.', buffer.length - i - 1);
        }

        return resolve({ size, buffer: slicedBuffer });
      });
    }))
    .catch(debug('tree:error:read_zipped'));
}

function unzip(data) {
  return new Promise((resolve, reject) => {
    // zlib will ignore any extra bytes
    zlib.unzip(data, (err, buffer) => {
      if (err) {
        return reject(err);
      }

      return resolve(buffer);
    });
  });
}

module.exports = {
  readFileWithSize,
  unzip,
};
