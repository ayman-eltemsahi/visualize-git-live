var byteReader = require('../util/byte-reader');
const C = require('../constants');


function parse(chunk, index) {
    var reader = byteReader.getReader(chunk, index);
    var items = [];

    while (reader.remaining()) {

        let id   = reader.nextUntil(0x20, C.STRING);

        let type = typeFromId(id, chunk.slice(index));

        let name = reader.nextUntil(0x00, C.STRING);

        let sha  = reader.next(20, C.HEX);

        items.push(
            {
                id,
                sha,
                name,
                type
            }
        );
    }

    return items;
};

function typeFromId(id , k) {
    id = id.trim();

    switch (id) {
        case  "40000" :
        case "040000" :  return C.TREE ;
        default:         return C.BLOB ;
    }
}

module.exports = {
    parse
}