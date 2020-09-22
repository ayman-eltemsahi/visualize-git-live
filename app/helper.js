const path = require('path');
const C = require('./constants');
const config = require('../config');

function shaFromPath(pathname) {
  const s = pathname.split('\\');
  const n = s.length;
  return s[n - 2] + s[n - 1];
}

function dirFromPath(pathname) {
  const s = pathname.split('\\');
  return s.slice(0, s.length - 2).join('\\');
}

function lastAfterSplit(item, splitter) {
  const arr = item.split(splitter);
  return arr[arr.length - 1];
}

function getFileNameFromSha(dir, sha) {
  return path.join(dir, sha.substr(0, 2), sha.substr(2));
}

function formatSize(fileSize) {
  if (typeof fileSize !== 'number') return fileSize;

  if (fileSize > 1000000000) {
    return `${(fileSize / 1000000000).toPrecision(3)} GB`;
  }

  if (fileSize > 1000000) {
    return `${(fileSize / 1000000).toPrecision(3)} MB`;
  }

  if (fileSize > 1000) {
    return `${(fileSize / 1000).toPrecision(3)} KB`;
  }

  return `${fileSize} bytes`;
}

function removeExtension(name) {
  const dotIndex = name.lastIndexOf('.');
  return (dotIndex === -1) ? name : name.substr(0, dotIndex);
}

function removeDuplicates(array) {
  if (!Array.isArray(array) || array.length < 2) return array;

  array.sort();
  const result = [array[0]];
  for (let i = 1; i < array.length; i++) {
    if (array[i] !== array[i - 1]) {
      result.push(array[i]);
    }
  }

  return result;
}

function getTypeFromString(type) {
  switch (type) {
    case 'blob': return C.BLOB;
    case 'tree': return C.TREE;
    case 'commit': return C.COMMIT;
    default: return C.UNKNOWN;
  }
}

function limitDataSize(data) {
  return (data && data.length > config.maxKeepFileSize)
    ? `${data.substr(0, config.maxKeepFileSize - 10)} ...................`
    : data;
}

function getNodeWhereHeadPoints(head = '') {
  let node;
  head = head.toString().trim();
  if (head.startsWith('ref')) {
    const sp = head.split('/');
    node = sp[sp.length - 1].trim();

    return node;
  }

  return head;
}

module.exports = {
  shaFromPath,
  dirFromPath,
  lastAfterSplit,
  getFileNameFromSha,
  formatSize,
  removeExtension,
  removeDuplicates,
  getTypeFromString,
  limitDataSize,
  getNodeWhereHeadPoints,
};
