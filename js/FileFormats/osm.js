define("js/FileFormats/osm", ["js/FileFormats/XML", "three", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/UTM"], function(XML, Three, Vertex, Edge, Container, Network, UTM) {

    class OSM extends XML {

        constructor(source, data) {
            super("osm");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);
            
            let nodes = {};
            $xml.children("node").each(function() {
                let $node = $(this)
                nodes[$node.attr("id")] = {
                    time: $node.attr("timestamp"),
                    lat: parseFloat($node.attr("lat")),
                    lon: parseFloat($node.attr("lon"))
                };
            });
            let ways = new Container(source);
            $xml.children("way").each(function() {
                let $way = $(this);
                let id = $way.attr("id");
                $way.children("tag").each(function() {
                    if ($(this).attr("k") === "name")
                        id = $(this).attr("v");
                });
                let way = new Network(id);
                let lastVert;
                $way.children("nd").each(function() {
                    let nid = $(this).attr("ref");
                    let pt = nodes[nid];
                    if (!pt)
                        throw new Error("Corrupt osm; " + nid + " missing");
                    let utm = UTM.fromLatLong(pt.lat, pt.lon);
                    let v = new Vertex(
                        pt.time,
                        new Three.Vector3(utm.easting, utm.northing, 0));
                    // Networks in Survey don't share vertices
                    way.addChild(v);
                    if (lastVert)
                        way.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                });
                ways.addChild(way);
            });
            return Promise.resolve(ways);
        }
    }
    return OSM;
});

