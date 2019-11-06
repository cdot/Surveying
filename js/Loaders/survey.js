define("js/Loaders/survey", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

    class SURVEY extends XML {

        constructor(source, data) {
            super(source, data, "survey");
        }

        // @Override
        load() {
            function loadNetwork($net) {
                let id = $net.attr("id");
                let net = new Network(id);
                let nodes = {};
                $net.children("node").each(function() {
                    let $nd = $(this);
                    let id = $nd.attr("id");
                    let name = $nd.attr("name");
                    let x = parseFloat($nd.attr("x"));
                    let y = parseFloat($nd.attr("y"));
                    let z = parseFloat($nd.attr("z"));
                    let v = new Vertex(name, new Three.Vector3(x, y, z));
                    net.addObject(v);
                    nodes[id] = v;
                });
                $net.children("network").each(function() {
                    net.addObject(loadNetwork($(this)));
                });
                $net.children("edge").each(function() {
                    let $edge = $(this);
                    let n1 = nodes[$edge.attr("p1")];
                    if (!n1)
                        throw new Error("Corrupt survey; " + n1 + " missing");
                    let n2 = nodes[$edge.attr("p2")];
                    if (!n2)
                        throw new Error("Corrupt survey; " + n2 + " missing");
                    net.addEdge(new Edge(n1, n2));
                });
                return net;
            }
            
            let nets = [];
            let loader = this;
            this.$xml.children("network").each(function() {
                nets.push(loadNetwork($(this)));
            });
            return nets;
        }
    }
    return SURVEY;
});

