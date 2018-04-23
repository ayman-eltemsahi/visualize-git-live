var byteReader = require('../util/byte-reader');
const C = require('../constants');


function parse(chunk, index) {
    var data, reader = byteReader.getReader(chunk, index);

    // tree b6ecba2d30910dc90538437f744bdd5ef9090e6a
    reader.skipUntil(0x20);
    var treeSha = reader.next(40, C.STRING);

    // parent c06d5360736e2e8e8c406e826705bb7127ab41c1
    var parents = [];
    while (true) {
        data = reader.nextUntil(0x20, C.STRING);

        if (data.trim() === 'parent') {
            var parentSha = reader.next(40, C.STRING);
            parents.push(parentSha);
        } else {
            break;
        }
    }

    // author Author-Name <authoremail@email.com> 1519934845 +0200
    var author = reader.nextUntil(0xa, C.STRING);
    var authorData = reader.nextUntil(0x20, C.STRING);

    // committer Committer-Name <committeremail@email.com> 1519934845 +0200
    var committer = reader.nextUntil(0xa, C.STRING);
    var committerData = reader.nextUntil(0xa, C.STRING);

    /*
        commit message
    */
    var message = reader.toEnd(C.STRING, { peek: true });
    var header = reader.nextUntil(0xa, C.STRING);

    return  {
                header  ,
                message ,
                treeSha ,
                parents
            }
};


module.exports = {
    parse
}