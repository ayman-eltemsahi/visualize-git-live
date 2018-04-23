const fs = require('fs');


function readFile(file) {
    return new Promise(function (resolve, reject) {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function readFileWithSize(file) {
    return new Promise(function (resolve, reject) {
        fs.stat(file, (err, data) => {
            fs.readFile(file, (err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ size: data.size, buffer });
                }
            });
        });
    });
}

function readFileSnippet(file, bytesCount) {
    return new Promise(function (resolve, reject) {
        fs.stat(file, (err, { size: fileSize }) => {

            fs.open(file, 'r', function (status, fd) {
                if (status) {
                    reject(status.message);
                    return;
                }

                bytesCount = Math.min(bytesCount, fileSize);

                var buffer = new Buffer(bytesCount);
                fs.read(fd, buffer, 0, bytesCount, null, function (err, num) {
                    if (err) return reject(err);

                    resolve({
                        size: fileSize,
                        data: buffer.toString('utf-8', 0, num)
                    });

                });
            });

        });
    });
}

function fileExists(file) {
    return new Promise(function (resolve, reject) {
        fs.exists(file, (exists) => {
            resolve(exists);
        });
    });
}

function readFolder(dir) {
    return new Promise(function (resolve, reject) {

        fs.readdir(dir, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    })
}

module.exports = {
    readFile,
    readFileSnippet,
    readFileWithSize,
    readFolder,
    fileExists
}