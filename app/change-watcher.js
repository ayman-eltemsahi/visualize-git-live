const pfs = require('./pfs');
const fs = require('fs');
const TreeNode = require('./treenode');
const parser = require('./parser');
const helper = require('./helper');
const socket = require('./socket');
const watchDebug = require('debug')('watch');
const watchErrorDebug = require('debug')('watch:error');
const C = require('./constants');

var watchCount = 1;
const tree = require('./tree').getInstance();

var timeoutId;
var headChanges = [];
var refChanges = [];
var objectsChanges = [];

function setupListeners(dir) {
    objectsListener(dir);
    refsListener(dir);
    headListener(dir);
}

function headListener(dir) {
    fs.watch(`${dir}/HEAD`, (eventType, filename) => {

        stageChange(headChanges, [`${dir}/HEAD`, eventType, filename])
    });
}

function headChangeHandler(headDir) {
    return pfs.readFile(headDir)
              .then(head => {
      
                  var headNode = tree.get('HEAD');
      
                  let currentChild = headNode.children[0];
                  if (currentChild) {
                      socket.removeEdge(headNode, currentChild);
                      headNode.clearChildren();
                  }
      
                  let sha = helper.getNodeWhereHeadPoints(head);
                  let node = tree.get(sha);
      
                  if (!node) {
                      node = new TreeNode(headDir, sha, C.BRANCH);
                      tree.set(sha, node);
                      socket.addNode(node);
                  }
                  headNode.addChild(node);
                  socket.addEdge(headNode, node);
      
              })
              .catch(watchErrorDebug);
}

function objectsListener(dir) {
    fs.watch(`${dir}/objects/`, (eventType, filename) => {

        stageChange(objectsChanges, [`${dir}/objects/`, eventType, filename]);
    });
}

function objectsChangeHandler(dir, eventType, filename) {
    watchDebug(watchCount++, 'objectsChangeHandler');

    if (!filename) {
        watchErrorDebug('objectsChangeHandler : ', "didn't receive filename");
    }

    if (filename.length !== 2) return;

    return pfs.readFolder(dir + filename)
        .then(files => {

            var all = files.filter(file => file.toString().endsWith('.lock') == false)
                           .map(file => filename + file)
                           .map(sha => {
   
                               let node = tree.get(sha);
                               if (node) return;
   
                               watchDebug(watchCount++, 'new file : ', sha);
   
                               node = new TreeNode(dir, sha);
                               tree.set(sha, node);
                               return node.explore()
                                          .then(_ => {
   
                                              socket.addNode(node);
   
                                              if (node.type === C.COMMIT || node.type === C.TREE) {
                                                  node.children.forEach(child => socket.addNode(child));
                                              }
   
                                              node.children.forEach(child => socket.addEdge(node, child));
   
                                              return _;
                                          });
                           });

            return Promise.all(all);
        })
        .catch(watchErrorDebug);
}


function refsListener(dir) {

    fs.watch(`${dir}/refs/heads/`, (eventType, filename) => {

        stageChange(refChanges, [dir, eventType, filename]);
    });
}

function refsChangeHandler(dir, eventType, filename) {
    watchDebug(watchCount++, 'refsChangeHandler');

    return pfs.readFolder(`${dir}/refs/heads/`)
              .then(refFiles => {
                  let foundRefs = [];

                  var all = refFiles.filter(file => file.toString().endsWith('.lock') == false)
                                    .map(file => {
              
                                        return pfs.readFile(`${dir}/refs/heads/${file}`)
                                                  .then(data => data.toString().trim())
                                                  .then(data => {
              
                                                      foundRefs.push(file);
                                                      let sha = file;
                                                      let head = tree.get(sha);
                                                      if (!head) {
                                                          head = new TreeNode(dir, sha, C.BRANCH, file);
                                                          socket.addNode(head);
                                                          tree.set(sha, head);
                                                      }
              
                                                      var child = tree.get(data.substr(0, 40));
              
                                                      if (head.children[0] === child) {
                                                          return;
                                                      }
              
                                                      if (head.children[0]) {
                                                          socket.removeEdge(head, head.children[0]);
                                                          head.clearChildren();
                                                      }
              
                                                      socket.addEdge(head, child)
                                                      head.addChild(child);
              
                                                      return data;
                                                  })
                                                  .catch(watchErrorDebug);
                                    });

                  return Promise.all(all).then(() => foundRefs);
              })
              .then(foundRefs => {

                  return pfs.fileExists(`${dir}/packed-refs`)
                            .then(exists => {
                                if (!exists) return '';
                                return pfs.readFile(`${dir}/packed-refs`)
                            })
                            .then(data => data.toString())
                            .then(data => {
    
                                var refs = data.split('\n')
                                                .filter(line => !line.startsWith('#') && line)
                                                .map(line => {
                                                    //  58defe8f293146c15fb99333f0561bf627aab1d6 refs/heads/master
                                                    let [, loc] = line.trim().split(' ');
                                                    return helper.lastAfterSplit(loc, '/');
                                                });
    
                                foundRefs.push(...refs);                
    
                                return foundRefs;
                            });
              })
              .then(foundRefs => {

                  tree.getBranches()
                      .filter(branch => foundRefs.findIndex(x => x == branch.sha) === -1)
                      .forEach(branch => {
                          branch.children.forEach(child => socket.removeEdge(branch, child));

                          branch.clearChildren();
                          tree.remove(branch);

                          socket.removeNode(branch);
                      });
              })
              .catch(watchErrorDebug);
}

function stageChange(bucket, args) {
    if (bucket.find(item => item[0] == args[0] && item[2] == args[2])) return;

    bucket.push(args);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => checkChanges(), 500);
}

function checkChanges() {

    var objectsChanges2 = objectsChanges;
    var refChanges2 = refChanges;
    var headChanges2 = headChanges;

    objectsChanges = [];
    refChanges = [];
    headChanges = [];

    return Promise.resolve()
                 .then(  Promise.all( objectsChanges2.map(args => objectsChangeHandler (...args)) ) )
                 .then(  Promise.all( refChanges2    .map(args => refsChangeHandler    (...args)) ) )
                 .then(  Promise.all( headChanges2   .map(args => headChangeHandler    (...args)) ) )

                 .catch( watchErrorDebug );
}


module.exports = {
    setupListeners
}