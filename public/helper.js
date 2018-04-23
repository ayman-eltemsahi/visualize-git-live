const C = {
              COMMIT        :   1  ,
              TREE          :   2  ,
              BLOB          :   3  ,
              TAG           :   4  ,
              HEAD          :   8  ,
              BRANCH        :   9  ,
          };

function getNodeColor(type) {

    switch (type) {
        case C.TREE   : return 'green'  ;
        case C.BLOB   : return 'yellow' ;
        case C.COMMIT : return 'cyan'   ;
        case C.BRANCH : return 'white'  ;
        case C.HEAD   : return 'gray'   ;
        default       : return 'red'    ;
    }
}

function processNode(node) {
    if (nodesMap.has(node.id)) {
        return;
    }

    nodesMap.set(node.id, node);

    node.color = { background: getNodeColor(node.type) };
    switch(node.type){
        case C.BLOB   : return node.type = 'blob';
        case C.TREE   : return node.type = 'tree';
        case C.COMMIT : return node.type = 'commit';
        case C.BRANCH : return node.type = 'branch';
        case C.HEAD   : return node.type = 'head';
    }
}

function processEdge(edge) {
    edge.id = `${edge.from}_${edge.to}`;
    edge.arrows = 'to';
}