const WebSocketServer = require('websocket').server;
const helper = require('./helper');
var debug = require("debug")("socket");

var clientId = 0;
var clients = [];
function initialize(server) {

    var wsServer = new WebSocketServer({ httpServer: server });
    wsServer.on('request', function (r) {
        debug("connection");
        var connection = r.accept();

        let id = clientId++;
        clients[id] = connection;
        let remoteAddress = connection.remoteAddress;
        let ipId = remoteAddress.split('.').reverse()[0];

        connection.on('message', function (message) {

            clients.forEach(client => client.sendUTF(ipId + ' ' + message.utf8Data));
        });

        connection.on('close', function (reasonCode, description) {
            delete clients[id];
        });
    });
}

function addNode(node) {

    let label = node.id;
    if (node.name) label = node.name;

    sendMessageToAll({
        type: 'addnode',
        data: {
            id: node.id,
            label: `${label}`,
            type: node.type
        }
    });
}

function removeNode(node) {

    let label = node.id;
    if (node.name) label = node.name;

    sendMessageToAll({
        type: 'removenode',
        data: {
            id: node.id
        }
    });
}

function addEdge(from, to) {
    sendMessageToAll({
        type: 'addedge',
        data: {
            from: from.id,
            to: to.id
        }
    });
}

function removeEdge(from, to) {
    sendMessageToAll({
        type: 'removeedge',
        data: {
            from: from.id,
            to: to.id
        }
    });
}

function sendMessageToAll(obj) {
    clients.forEach(client => {
        client.sendUTF(JSON.stringify(obj));
    });
}

module.exports = {
    initialize,

    addNode,
    removeNode,
    addEdge,
    removeEdge
};
