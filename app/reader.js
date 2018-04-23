const zlib = require('zlib');
const gzip = zlib.createUnzip();
const pfs = require('./pfs');
const fs = require('fs');
const debug = require('debug');
const path = require('path');
const TreeNode = require('./treenode');
const helper = require('./helper');
const parser = require('./parser');
const socket = require('./socket');
const changeWatcher = require('./change-watcher');
const packReader = require('./pack-reader');
const C = require('./constants');

var tree;

function getTree(dir) {
    tree = require('./tree').getInstance();

    var headNode = new TreeNode(dir, 'HEAD', C.HEAD);
    tree.set('HEAD', headNode);

    return readPacks(dir)
            .then(()      => readObjectsFolder (dir)  )
            .then(()      => readPackedRefs    (dir)  )
            .then(()      => readRefs          (dir)  )
            .then(()      => readHead          (dir)  )
            .then(()      => tree                     )   /* return the tree */

            .catch(err => {
                debug('tree:error:getTree')(err);
                throw err;  // propagate the error to the caller
            });
}

function makeBranchNode(dir, commitSha, branchSha, filename) {
    let head = new TreeNode(dir, branchSha, C.BRANCH, filename);

    tree.set(branchSha, head);

    commitSha = commitSha.toString().trim().substr(0, 40);
    head.addChild(tree.get(commitSha));
    return commitSha;
}

function readObjectsFolder(dir) {
    return pfs.readFolder(`${dir}/objects`)
              .then(folders => folders.filter(folder => folder.toString().length === 2)        ) // ignore info and pack
              .then(folders => folders.map   (folder => readSingleObjectsFolder(dir, folder) ) )
              .then(_all => Promise.all(_all));
}

function readSingleObjectsFolder(dir, folderName /* first two letters of the sha */) {
    return pfs.readFolder(`${dir}/objects/${folderName}`)
              .then(restOfShas /* string[] */ => {
                  return restOfShas.map(restOfSha => parseFile(`${dir}/objects/${folderName}`, folderName + restOfSha));
              })
              .then(_all => Promise.all(_all));
}

function readRefs(dir) {
    return pfs.readFolder(`${dir}/refs/heads`)
              .then(refFiles => {
                  return refFiles.map(file =>
                        (
                            pfs.readFile(`${dir}/refs/heads/${file}`)
                                .then(data => makeBranchNode(dir, data, file))
                                .catch(debug('tree:error:readRefs:inside'))
                        )
                  )
              })
              .then(_all => Promise.all(_all))
              .catch(debug('tree:error:readRefs'));
}

function readPackedRefs(dir) {
    return pfs.fileExists(`${dir}/packed-refs`)
              .then(exists => {

                  if (exists) {
                      return pfs.readFile(`${dir}/packed-refs`);
                  } else {
                      return '';
                  }

              })
              .then(data => data.toString())
              .then(data => {
  
                  data.split('\n')
                      .filter(line => line && !line.startsWith('#'))
                      .filter(line => line.indexOf('tag') == -1 && line.indexOf('remote') == -1)
                      .forEach(line => {
                          //  58defe8f293146c15fb99333f0561bf627aab1d6 refs/heads/master
                          let [sha, loc] = line.trim().split(' ');
  
                          if (loc) {
                              let name = helper.lastAfterSplit(loc, '/');
                              makeBranchNode(dir, sha, name, name);
                          }
                      });
              })
              .catch(debug('tree:error:readPackedRefs'));
}

function readHead(dir) {
    return pfs.readFile(`${dir}/HEAD`)
              .then(head => {

                  let headNode = tree.get('HEAD');
                  let sha = helper.getNodeWhereHeadPoints(head);
                  let node = tree.get(sha);
                  headNode.addChild(node);

                  return head;
              })
              .catch(debug('tree:error:readHead'));
}


function parseFile(dir, sha) {
    var node = tree.get(sha);

    if (!node) {
        node = new TreeNode(dir, sha);
        tree.set(sha, node);
    }

    return node.explore();
}

function readPacks(dir) {

    // the packs info file
    let info  = pfs.fileExists(`${dir}/objects/info/packs`)
                   .then(exists => {

                       if (exists) {
                           return pfs.readFile(`${dir}/objects/info/packs`);
                       } else {
                           return '';
                       }

                   })
                   .then(data => data.toString().split('\n'));

    // sometimes, the pack is not registered in the info file               
    let files = pfs.readFolder(`${dir}/objects/pack`)
                   .then(files => files.map(helper.removeExtension));

    
    return Promise.all([info, files])
                   .then(res => {
                       let all = [];
                       all.push(...res[0].filter(x => x ));
                       all.push(...res[1].filter(x => x ));

                       return all.map(file => {
                                     if (file.startsWith("P ") || file.startsWith("p ")) {
                                         file = file.substr(2).trim();
                                     }
                                     return file;
                                 })
                                 .map(helper.removeExtension);

                   })
                   .then(helper.removeDuplicates)
                   .then(allPacks => allPacks.map(file => readSinglePack(dir, file)))
                   .then(_all => Promise.all(_all));
}

function readSinglePack(dir, file) {
    if (file.endsWith('.pack')) file = file.substr(0, file.length - 5);

    if (!file) return

    return packReader
                .read(`${dir}/objects/pack/${file}`)
                .then(alldata => {

                    return alldata.map(data => {
                                              
                                      if (!data) return;
                                      
                                      if (!data.data) {
                                          debug('tree:data.data')(data);
                                      }
  
                                      let node = tree.get(data.sha);
                                      if (!node) {
                                          node = new TreeNode(dir, data.sha, data.type, data.data);
                                          tree.set(data.sha, node);
                                      } else {
                                          node.patch(dir, data.sha, data.type, data.data);
                                      }
  
                                      return node.explore(true /* isPack */);
                                  });
                })
                .then(_all => Promise.all(_all));
}


module.exports = {
    getTree,
    setupWatcher: function (dir) {
        changeWatcher.setupListeners(dir);
    }
}