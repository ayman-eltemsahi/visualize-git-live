const C = require('./constants');

class Tree {

    constructor() {
        this.nodes = new Map();
        this.shortNodes = new Map();
    }

    entries() {
        return this.nodes;
    }

    values() {
        return this.nodes.values();
    }

    [Symbol.iterator]() {
        return this.nodes[Symbol.iterator];
    }

    get(sha) {
        let node = this.nodes.get(sha);
        if (!node) {
            node = this.shortNodes.get(sha);
        }
        return node;
    }

    set(sha, node) {

        this.nodes.set(sha, node);
        this.shortNodes.set(sha.substr(0, 7), node);
        return node;
    }

    remove(node) {
        if (typeof node !== 'string') node = node.sha;

        return this.nodes.delete(node);
    }

    has(sha) {
        return this.nodes.has(sha) || this.shortNodes.has(sha);
    }

    getBranches() {

        let b = [];
        for (let item of this.values()) {
            if (item.type === C.BRANCH) {
                b.push(item);
            }
        }

        return b;
    }
}

var instance = null;

function getInstance() {
    if (instance === null) {
        instance = new Tree();
    }

    return instance;
}

function getNew() {
    instance = null;
    return getInstance();
}

module.exports = {
    getInstance,
    getNew
}