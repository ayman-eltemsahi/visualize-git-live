const debug = require('debug');
const tree = require('./tree');
const pfs = require('./pfs');
const C = require('./constants');
const byteReader = require('./util/byte-reader');
const parser = require('./parser');
const helper = require('./helper');
const zipped = require('./zipped');

const LEAF = Promise.resolve(0);

class TreeNode {
  constructor(dir, sha, type, data) {
    this.sha = '';
    this.name = '';
    this.children = [];
    this.lastRequestedEdge = undefined;

    this.patch(dir, sha, type, data);
  }

  /**
   *
   * @param {String} dir
   * @param {String} sha
   * @param {String} type
   * @param {*} data
   */
  patch(dir, sha, type, data) {
    dir = dir || this.dir;
    const index = dir.indexOf('.git');
    this.dir = (index > -1) ? dir.substr(0, index) : dir;

    this.type = type || this.type;
    this.sha = sha || this.sha;
    this.id = this.sha.substr(0, 7);

    this.explored = false;
    this.data = data || this.data;
  }

  /**
   *
   * @param {String} name
   */
  setName(name) {
    this.name = name || this.name;
  }

  addChild(child) {
    if (!child || !child.sha) return;
    if (this.children.find(x => x.sha === child.sha)) return;
    this.children.push(child);
  }

  clearChildren() {
    this.children.length = 0;
  }

  /**
   * read the contents of this node and decide its type, data and children (if exist)
   * @param {Boolean} isPack
   */
  explore(isPack) {
    if (this.explored) {
      return LEAF;
    }

    if (isPack) {
      if (!this.data || !this.data.length) {
        // console.error('isPack && !data', `type = ${this.type}, sha = ${this.sha}`);
        return LEAF;
      }

      const parsedData = parser.parse(this.type, this.data);
      return this.parseData(parsedData, true);
    }

    const filepath = helper.getFileNameFromSha(`${this.dir}/.git/objects`, this.sha);
    return pfs.exists(filepath)
      .then(exists => {
        if (exists) {
          return zipped.readFileWithSize(filepath);
        }

        debug('tree:no_file')(filepath);
        return this.data ? ({ size: this.data.size, buffer: this.data }) : null;
      })
      .then(data => {
        if (!data) {
          debug('tree:no_data')(data, this.type, this.sha);
          return LEAF;
        }

        const reader = byteReader.getReader(data.buffer);

        const tryFiguringType = reader.nextUntil(0x20, C.STRING, { maxLength: 100 });
        reader.skipUntil(0x00);

        this.type = helper.getTypeFromString(tryFiguringType);
        this.type = this.type || C.BLOB;

        this.size = this.size || data.size;

        const parsedData = parser.parse(this.type, data.buffer, this.type === C.BLOB ? 0 : reader.getIndex());

        this.data = parsedData;
        return this.parseData(parsedData);
      })
      .catch(debug('tree:error:explore'));
  }

  /**
   * return the edges between this node and its children
   * and call the children method recursively
   * @param {*} edgeTimeStamp
   * @param {*} edges
   * @param {Function} selector
   */
  fillEdges(edgeTimeStamp, edges, selector) {
    if (this.lastRequestedEdge === edgeTimeStamp) return;
    this.lastRequestedEdge = edgeTimeStamp;

    this.children
      .forEach(child => {
        edges.push({ from: selector(this), to: selector(child) });
        child.fillEdges(edgeTimeStamp, edges, selector);
      });
  }

  /**
   * decides the type of data and creates the node according to its type
   * @param {*} data
   * @param {Boolean} isPack
   */
  parseData(data, isPack) {
    if (!data) return LEAF;

    this.explored = true;

    switch (this.type) {
      case C.TREE: return this.parseTree(data, isPack);
      case C.BLOB: return this.parseBlob(data, isPack);
      case C.COMMIT: return this.parseCommit(data, isPack);

      default:
        this.explored = false;
        return LEAF;
    }
  }

  /**
   *
   * @param {*} data
   * @param {Boolean} isPack
   */
  parseCommit(data, isPack) {
    const currentTree = tree.getInstance();

    const { treeSha } = data;
    this.setName(data.header);

    let node = currentTree.get(treeSha);
    if (!node) {
      node = new TreeNode(this.dir, treeSha, C.TREE); // create a temporary placeholder
      currentTree.set(treeSha, node);
      node.explore(isPack);
    }

    this.addChild(node);

    data.parents.forEach(parent => {
      node = currentTree.get(parent);
      if (!node) {
        node = new TreeNode(this.dir, parent, C.COMMIT);
        currentTree.set(parent, node);
      }
      this.addChild(node);
    });

    this.data = data.message;
    return Promise.all(this.children.map(child => child.explore(isPack)));
  }

  /**
   *
   * @param {*} data
   * @param {Boolean} isPack
   */
  parseTree(data, isPack) {
    if (!Array.isArray(data)) return;
    const currentTree = tree.getInstance();

    data.forEach(item => {
      const { sha } = item;

      let node = currentTree.get(sha);
      if (!node) {
        node = new TreeNode(this.dir, item.sha, item.type);
        currentTree.set(sha, node);
      }

      node.setName(item.name);
      this.addChild(node);
    });

    this.data = this.children.map(child => child.name).join('\n');
    return Promise.all(this.children.map(child => child.explore(isPack)));
  }

  /**
   *
   * @param {*} data
   * @param {Boolean} isPack
   */
  parseBlob(data /* , isPack */) {
    this.data = data;
    return Promise.resolve(this.data);
  }
}

module.exports = TreeNode;
