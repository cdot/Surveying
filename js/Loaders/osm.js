define("js/Loaders/osm", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

    class OSM extends XML {

        constructor(source, data) {
            super(source, data, "osm");
        }

        // @Override
        load() {
            let nodes = {};
            for (let node of this.root.getElementsByTagName("node")) {
                nodes[node.getAttribute("id")] = {
                    time: node.getAttribute("timestamp"),
                    lat: parseFloat(node.getAttribute("lat")),
                    lon: parseFloat(node.getAttribute("lon"))
                };
            }
            let nets = [];
            for (let way of this.root.getElementsByTagName("way")) {
                let id = way.getAttribute("id");
                for (let tag of way.getElementsByTagName("tag")) {
                    if (tag.getAttribute("k") === "name")
                        id = tag.getAttribute("v");
                }
                let net = new Network(id);
                let lastVert;
                for (let nd of way.getElementsByTagName("nd")) {
                    let pt = nodes[nd.getAttribute("ref")];
                    let point = new Three.Vector3(pt.lon, pt.lat, 0);
                    let v = new Vertex(pt.time, point);
                    net.addVertex(v);
                    if (lastVert)
                        net.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                }
                nets.push(net);
            }
            return nets;
        }
    }
    return OSM;
});

