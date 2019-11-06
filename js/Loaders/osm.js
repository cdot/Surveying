define("js/Loaders/osm", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

    class OSM extends XML {

        constructor(source, data) {
            super(source, data, "osm");
        }

        // @Override
        load() {
            let nodes = {};
            this.$xml.children("node").each(function() {
                let $node = $(this)
                nodes[$node.attr("id")] = {
                    time: $node.attr("timestamp"),
                    lat: parseFloat($node.attr("lat")),
                    lon: parseFloat($node.attr("lon"))
                };
            });
            let nets = [];
            this.$xml.children("way").each(function() {
                let $way = $(this);
                let id = $way.attr("id");
                $way.children("tag").each(function() {
                    if ($(this).attr("k") === "name")
                        id = $(this).attr("v");
                });
                let net = new Network(id);
                let lastVert;
                $way.children("nd").each(function() {
                    let nid = $(this).attr("ref");
                    let pt = nodes[nid];
                    if (!pt)
                        throw new Error("Corrupt osm; " + nid + " missing");
                    let point = new Three.Vector3(pt.lon, pt.lat, 0);

                    let v = new Vertex(pt.time, point);
                    // Networks in Survey don't share vertices
                    net.addObject(v);
                    if (lastVert)
                        net.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                });
                nets.push(net);
            });
            return nets;
        }
    }
    return OSM;
});

