'use strict';

function drawVisJs(nodes, edges) {
    nodes.forEach(node => {
        processNode(node);
        nodesMap.set(node.id, node);
    });

    edges.forEach(processEdge);

    const improvedLayout = nodes.length < 150;

    nodesDataSet = new vis.DataSet(nodes.filter(x => visibleType[x.type]));
    edgesDataSet = new vis.DataSet(edges);

    const head = nodes.find(x => x.id === 'HEAD');
    selectedNode = head ? "HEAD" : "master";
    lastOp();

    // graph network
    const container = document.getElementById('graph');
    const graphData = {
        nodes: nodesDataSet,
        edges: edgesDataSet
    };

    const options = {
        layout: {
            // randomSeed: 6333,
            improvedLayout: improvedLayout
        },
        height: '100%',
        width: '100%',
        physics: nodesDataSet.length < 100,
    };

    const network = new vis.Network(container, graphData, options);

    listenToEvents(network);

    return network;
}

function listenToEvents(network) {
    network.on("doubleClick", function (params) {
        const nodeId = params.nodes[0];

        if (!nodeId) {
            console.log(`nodeId does not exist!`);
            return;
        }

        get('/nodedata/' + nodeId)
            .then(node => {
                console.log(node);
                console.log(node.data);
            });
    });

    network.on("click", function (params) {
        const nodeId = params.nodes[0];

        if (!nodeId) {
            console.log(`nodeId does not exist!`);
            return;
        }

        selectedNode = nodeId;
    });
}
