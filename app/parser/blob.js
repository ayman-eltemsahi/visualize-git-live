'use strict';

const config = require('../../config');

function parse(chunk, index) {
  const len = chunk.length - index;
  if (len > config.maxKeepFileSize) {
    return chunk.slice(index, config.maxKeepFileSize - 15).toString() + '...............';
  }

  return chunk.slice(index, chunk.length).toString();
};

module.exports = {
  parse,
}
