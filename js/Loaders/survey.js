define("js/Loaders/survey", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

    class SURVEY extends XML {

        constructor(source, data) {
            super(source, data, "survey");
        }

        loadNetwork(netel) {
            let id = netel.getAttribute("id");
            let net = new Network(id);
            let nodes = {};
            for (let nd of netel.children) {
                if (nd.tagName === "node") {
                    let id = nd.getAttribute("id");
                    let name = nd.getAttribute("name");
                    let x = parseFloat(nd.getAttribute("x"));
                    let y = parseFloat(nd.getAttribute("y"));
                    let z = parseFloat(nd.getAttribute("z"));
                    let v = new Vertex(name, new Three.Vector3(x, y, z));
                    net.addVertex(v);
                    nodes[id] = v;
                } else if (nd.tagName === "network") {
                    net.addSubnet(this.loadNetwork(nd));
                } else if (nd.tagName === "edge") {
                    let n1 = nodes[nd.getAttribute("p1")];
                    if (!n1)
                        throw new Error("Corrupt survey; " + n1 + " missing");
                    let n2 = nodes[nd.getAttribute("p2")];
                    if (!n2)
                        throw new Error("Corrupt survey; " + n2 + " missing");
                    net.addEdge(new Edge(n1, n2));
                }
            }
            return net;
        }
        
        // @Override
        load() {
            let nets = [];
            for (let kid of this.root.children)
                nets.push(this.loadNetwork(kid));
            return nets;
        }
    }
    return SURVEY;
});

