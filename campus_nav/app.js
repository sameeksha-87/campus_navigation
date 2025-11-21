let map = L.map('map').setView([23.1765, 80.0211], 17);

// Base layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Load GeoJSON layers
function loadLayer(file, color) {
    fetch(file)
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data, {
                style: { color: color, weight: 2 }
            }).addTo(map);
        });
}

loadLayer("roads.geojson", "blue");
loadLayer("footpaths.geojson", "green");
loadLayer("buildings.geojson", "brown");

// ------------------------------
// Load Graph (nodes + edges)
// ------------------------------

let nodes = {};
let edges = [];
let weights = [];

Promise.all([
    fetch("nodes.json").then(r => r.json()),
    fetch("edges.json").then(r => r.json()),
    fetch("weights.json").then(r => r.json())
]).then(([n, e, w]) => {
    nodes = n;
    edges = e;
    weights = w;
});

// ------------------------------
// Dijkstra Shortest Path
// ------------------------------
function dijkstra(start, end) {
    let dist = {};
    let prev = {};

    Object.values(nodes).forEach(id => {
        dist[id] = Infinity;
        prev[id] = null;
    });

    dist[start] = 0;
    let visited = new Set();

    while (true) {
        let curr = null;
        let currDist = Infinity;

        for (let node in dist) {
            if (!visited.has(node) && dist[node] < currDist) {
                currDist = dist[node];
                curr = node;
            }
        }

        if (curr === null || curr == end) break;
        visited.add(curr);

        edges.forEach((edge, i) => {
            let [a, b] = edge;

            if (a == curr) {
                let alt = dist[curr] + weights[i];
                if (alt < dist[b]) {
                    dist[b] = alt;
                    prev[b] = curr;
                }
            }
            if (b == curr) {
                let alt = dist[curr] + weights[i];
                if (alt < dist[a]) {
                    dist[a] = alt;
                    prev[a] = curr;
                }
            }
        });
    }

    let path = [];
    let u = end;
    while (u !== null) {
        path.unshift(u);
        u = prev[u];
    }
    return path;
}

// ------------------------------
// Click to select start & end
// ------------------------------
let startNode = null;
let endNode = null;

map.on('click', function (e) {
    let clicked = [e.latlng.lng, e.latlng.lat];
    let nearestID = getNearestNode(clicked);

    if (!startNode) {
        startNode = nearestID;
        alert("Start selected");
    } else if (!endNode) {
        endNode = nearestID;
        alert("End selected");

        let path = dijkstra(startNode, endNode);

        drawPath(path);
    }
});

// ------------------------------
// Find nearest graph node
// ------------------------------
function getNearestNode(coord) {
    let nearest = null;
    let minDist = Infinity;

    for (let key in nodes) {
        let id = nodes[key];
        let [lon, lat] = key.split(",").map(Number);

        let dist = Math.hypot(coord[0] - lon, coord[1] - lat);
        if (dist < minDist) {
            minDist = dist;
            nearest = id;
        }
    }

    return nearest;
}

// ------------------------------
// Draw route on map
// ------------------------------
function drawPath(nodePath) {
    let latlngs = nodePath.map(id => {
        for (let key in nodes) {
            if (nodes[key] == id) {
                let [lon, lat] = key.split(",").map(Number);
                return [lat, lon];
            }
        }
    });

    L.polyline(latlngs, { color: "red", weight: 4 }).addTo(map);
}
