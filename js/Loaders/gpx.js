define("js/Loaders/gpx", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

    class GPX extends XML {

        constructor(source, data) {
            super(source, data, "gpx");
        }

        // @Override
        load() {
            let nets = [];
            let loader = this;
            this.$xml.children("trk").each(function() {
                let $trk = $(this);
                let id = $trk.children("name").text() || loader.nextNet();
                console.debug("Loading track", id);
                let net = new Network(id);
                $trk.children("trkseg").each(function() {
                    let $seg = $(this);
                    let lastVert, lastLat = NaN, lastLon = NaN;
                    $seg.children("trkpt").each(function() {
                        let $tpt = $(this);
                        let lat = parseFloat($tpt.attr("lat"));
                        let lon = parseFloat($tpt.attr("lon"));
                        if (lat !== lastLat || lon !== lastLon) {
                            // TODO: record number of hits on duplicate point
                            lastLat = lat; lastLon = lon;
                            let time = $tpt.children("time").text();
                            let point = new Three.Vector3(lon, lat, 0);
                            let v = new Vertex(time, point);
                            net.addObject(v);
                            if (lastVert)
                                net.addEdge(new Edge(lastVert, v));
                            lastVert = v;
                        }
                    });
                });
                nets.push(net);
            });
            return nets;
        }
    }
    return GPX;
});

