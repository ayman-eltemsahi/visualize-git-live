const C = require('./constants');
const config = require('../config');
const path = require('path');

function shaFromPath(path) {
    var s = path.split('\\'), n = s.length;
    return s[n - 2] + s[n - 1];
}

function dirFromPath(path) {
    var s = path.split('\\');

    return s.slice(0, s.length - 2).join('\\');
}

function lastAfterSplit(item, splitter) {
    let arr = item.split(splitter);
    return arr[arr.length - 1];
}

function getFileNameFromSha(dir, sha) {
    return path.join(dir, sha.substr(0, 2), sha.substr(2));
}

function formatSize(fileSize) {
    if (typeof fileSize !== 'number') return fileSize;

    if (fileSize > 1000000000) {
        return (fileSize / 1000000000).toPrecision(3) + " GB";
    } else if (fileSize > 1000000) {
        return (fileSize / 1000000).toPrecision(3) + " MB";
    } else if (fileSize > 1000) {
        return (fileSize / 1000).toPrecision(3) + " KB";
    } else {
        return fileSize + " b"
    }
}

function removeExtension(name) {
    let dotIndex = name.lastIndexOf('.');
    if (dotIndex == -1) return name;
    return name.substr(0, dotIndex);
}

function removeDuplicates(array) {
    if (!Array.isArray(array) || array.length < 2) return array;

    array.sort();
    let result = [array[0]];
    for (let i = 1; i < array.length; i++) {
        if (array[i] !== array[i - 1]) {
            result.push(array[i]);
        }
    }

    return result;
}

function getTypeFromString(type) {
    switch (type) {
        case 'blob'    :  return C.BLOB   ;
        case 'tree'    :  return C.TREE   ;
        case 'commit'  :  return C.COMMIT ;
        default        :  return          ;
    }
}

function limitDataSize(data) {
    if (data && data.length > config.maxKeepFileSize) {
        data = data.substr(0, config.maxKeepFileSize - 10) + '...................';
    }

    return data;
}

function getNodeWhereHeadPoints(head) {
    var node;
    head = head || '';
    head = head.toString().trim();
    if (head.startsWith('ref')) {
        let sp = head.split('/');
        node = sp[sp.length - 1].trim();

        return node;
    }
    else {
        return head;
    }
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
    getNodeWhereHeadPoints
}