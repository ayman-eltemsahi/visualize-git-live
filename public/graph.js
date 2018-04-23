
function showReachable(level) {
    if (!selectedNode) return alert("please click on node first");

    level = Number.parseInt(level);

    var visited = new Set();
    recReachableFrom(selectedNode, visited, level);

    nodes.filter(node => !visited.has(node.id))
         .forEach(removeNode);
}

function showNotReachable(level) {
    if (!selectedNode) return alert("please click on node first");

    level = Number.parseInt(level);

    var visited = new Set();
    recReachableFrom(selectedNode, visited, level);

    visited.delete(selectedNode);
    nodes.filter(node => visited.has(node.id))
         .forEach(removeNode);
}

function recReachableFrom(nodeId, visited, level) {
    // no level in input ==> get all 
    if (typeof level !== 'number' || isNaN(level)) level = 1 << 30;

    // reached max level
    if (level < 1) return;

    if (visited.has(nodeId)) return;
    var it = nodesMap.get(nodeId);
    if (!it || !visibleType[it.type]) return;
    visited.add(nodeId);

    level--;

    edges.filter(edge => edge.from === nodeId)
         .forEach(edge => recReachableFrom(edge.to, visited, level));
}


function showWhoReach(level) {
    if (!selectedNode) return alert("please click on node first");
    level = Number.parseInt(level);

    var visited = new Set();
    recWhoReach(selectedNode, visited, level);

    nodes.filter(node => !visited.has(node.id))
         .forEach(removeNode);
}

function showNotWhoReach(level) {
    if (!selectedNode) return alert("please click on node first");
    level = Number.parseInt(level);

    var visited = new Set();
    recWhoReach(selectedNode, visited, level);

    visited.delete(selectedNode);
    nodes.filter(node => visited.has(node.id))
         .forEach(removeNode);
}

function recWhoReach(nodeId, visited, level) {
    // no level in input ==> get all 
    if ((typeof level !== 'number') || isNaN(level)) level = 1 << 30;

    // reached max level
    if (level < 1) return;

    if (visited.has(nodeId)) return;
    if (!visibleType[nodesMap.get(nodeId).type]) return;
    visited.add(nodeId);

    level--;

    edges.filter(edge => edge.to === nodeId)
         .forEach(edge => recWhoReach(edge.from, visited, level));
}