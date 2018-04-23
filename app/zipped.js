const pfs = require('./pfs');
const zlib = require('zlib');
const debug = require('debug');
const config = require('../config');

function readFileWithSize(path) {
    return pfs.readFileWithSize(path)
              .then(({ size, buffer: data }) => {
                  return new Promise(function (resolve, reject) {

                      if (!data) return reject(data);

                      zlib.unzip(data, (err, buffer) => {

                          if (err || !buffer) {
                              reject(err);
                          } else {
                              if (buffer.length > config.maxKeepFileSize) {
                                  buffer = buffer.slice(0, config.maxKeepFileSize);
                                  for (let i = 0; i < 15; i++) {
                                      buffer.write('.', buffer.length - i - 1);
                                  }
                              }
                              resolve({ size, buffer });
                          }
                      });

                  });
              })
              .catch(debug('tree:error:read_zipped'));
}

function unzip(data) {

    return new Promise(function (resolve, reject) {

        // zlib will ignore any extra bytes
        zlib.unzip(data, (err, buffer) => {

            if (err) {
                reject(err);
            } else {
                resolve(buffer);
            }

        });

    });
}

module.exports = {
    readFileWithSize,
    unzip
}