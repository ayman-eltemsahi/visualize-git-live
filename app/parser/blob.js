const config = require('../../config');

function parse(chunk, index) {

    let len = chunk.length - index;
    if (len > config.maxKeepFileSize) {
        return chunk.slice(index, config.maxKeepFileSize - 15).toString() + '...............';
    } else {
        return chunk.slice(index, chunk.length).toString();
    }
    
};

module.exports = {
    parse
}