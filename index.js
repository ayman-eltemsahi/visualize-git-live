const fs = require("fs");
const ip = require("ip");
const opn = require("opn");
const http = require("http");
const debug = require("debug");
const path = require("path");
const express = require("express");
const config = require("./config");
const msgs = require("./msgs");
const helper = require("./app/helper");
const reader = require('./app/reader');
const tree = require('./app/tree');

const app = new express();
const server = http.createServer(app);

app.use(express.static(config.publicFolder));

// set CORS
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin',      '*'                                      );
    res.setHeader('Access-Control-Allow-Methods',     'GET, POST, OPTIONS, PUT, PATCH, DELETE' );
    res.setHeader('Access-Control-Allow-Headers',     'X-Requested-With,content-type'          );
    res.setHeader('Access-Control-Allow-Credentials', true                                     );
    next();
});


/*
 * public homepage
 */
app.get('/', (req, res) => fs.createReadStream('./public/home.html').pipe(res));


/*
 * git tree
 */
app.get('/tree', (req, res) => {

    var dir = path.join(config.gitDirectory, '.git');
    reader.getTree(dir)
          .then(tree => {
  
              var nodes = [], edges = [];
              var edgeTimeStamp = +new Date();
              for (let node of tree.values()) {

                  let label = node.id;
                  if (node.name) label = node.name;

                  nodes.push({
                      id: node.id,
                      label: `${label}`,
                      type: node.type
                  });

                  node.fillEdges(edgeTimeStamp, edges, item => item.id);    // Sync
              }
  
              return {
                  nodes,
                  edges
              };
          })
          .then(data => {
              // setup file watchers for WebSocket
              reader.setupWatcher(dir);
  
              debug('log')(`${dir} is ready`);
              return data;
          })
          .then(data => res.json(data))
          .catch(err => {
              let msg = msgs[err.message];
              if (msg) {
                  res.json({
                      error: msg
                  });
              } else {
                  res.status(500).end();
              }
          });

});

/*
 * node data
 */
app.get('/nodedata/:nodeid', function (req, res) {
    let node_id = req.params.nodeid;
    debug('log')('get node data : ' + node_id);

    let node = tree.getInstance().get(node_id)

    if (!node) return res.end(node_id);

    res.json
        (
            {
                type          : node.type,
                sha           : node.sha,
                size          : node.size,
                formattedSize : helper.formatSize(node.size),
                chunked       : ((node.size || node.data.length) > config.maxKeepFileSize),
                data          : helper.limitDataSize(node.data)
            }
        );
});



const socket = require('./app/socket');
socket.initialize(server);

server.listen(config.portNumber, function () {
    console.log(`Server listening ::: ${config.portNumber}`);
    console.log("ip = " + ip.address());

    // opn(`http://${ip.address()}:${config.portNumber}`);
});
