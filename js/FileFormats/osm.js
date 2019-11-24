define("js/FileFormats/osm", ["js/FileFormats/XML", "three", "js/Vertex", "js/Container", "js/Network", "js/UTM"], function(XML, Three, Vertex, Container, Network, UTM) {

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
                let way = new Path(id);
                let lastVert;
                $way.children("nd").each(function() {
                    let nid = $(this).attr("ref");
                    let pt = nodes[nid];
                    if (!pt)
                        throw new Error("Corrupt osm; " + nid + " missing");
                    let utm = UTM.fromLatLong(pt.lat, pt.lon);
                    let v = way.addVertex(
                        {x: utm.easting, y: utm.northing, z: 0});
                    // Networks don't share vertices
                    if (lastVert)
                        way.addEdge(lastVert, v);
                    lastVert = v;
                });
                ways.addChild(way);
            });
            return Promise.resolve(ways);
        }
    }
    return OSM;
});

