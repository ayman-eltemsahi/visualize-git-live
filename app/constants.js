const C = {
    COMMIT        :   1   /* 001 */ ,
    TREE          :   2   /* 010 */ ,
    BLOB          :   3   /* 011 */ ,
    TAG           :   4   /* 100 */ ,
    OFS_DELTA     :   6   /* 110 */ ,
    REF_DELTA     :   7   /* 111 */ ,

    HEAD          :   8  ,
    BRANCH        :   9  ,

    COPY          :   1  ,
    INSERT        :   0  ,

    HEX           :   0  ,
    STRING        :   1  ,
    BIN           :   2  ,
    NUMBER        :   3  ,


};

Object.freeze(C);

module.exports = C;