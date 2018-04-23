const tree = require('./tree');
const blob = require('./blob');
const commit = require('./commit');
const C = require('../constants');

function parse(type, buffer, index) {
    switch (type) {
        case C.TREE   :     return tree  .parse(buffer, index) ;
        case C.BLOB   :     return blob  .parse(buffer, index) ;
        case C.COMMIT :     return commit.parse(buffer, index) ;
    }
}

module.exports = {
    parse,
    parse_tree   : tree.parse ,
    parse_blob   : blob.parse ,
    parse_commit : commit.parse
}