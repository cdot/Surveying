define("js/FileFormats/gpx", ["js/FileFormats/XML", "three", "js/Vertex", "js/Edge", "js/Network", "js/UTM"], function(XML, Three, Vertex, Edge, Network, UTM) {

    class GPX extends XML {

        constructor() {
            super("gpx");
        }

        // @Override
        load(source, data, metadata) {
            let $xml = super.load(source, data, metadata);

            let tracks = [];
            let loader = this;
            let zone;
            $xml.children("trk").each(function() {
                let $trk = $(this);
                $trk.children("trkseg").each(function() {
                    let $seg = $(this);
                    let id = loader.nextNet();
                    console.debug("Loading track", id);
                    let track = new Network(id);
                    let lastVert, lastLat = NaN, lastLon = NaN;
                    $seg.children("trkpt").each(function() {
                        let $tpt = $(this);
                        let lat = parseFloat($tpt.attr("lat"));
                        let lon = parseFloat($tpt.attr("lon"));
                        if (lat !== lastLat || lon !== lastLon) {
                            // TODO: record number of hits on duplicate point
                            lastLat = lat; lastLon = lon;
                            let time = $tpt.children("time").text();
                            let utm = UTM.fromLatLong(lat, lon);
                            let v = new Vertex(
                                time,
                                new Three.Vector3(
                                    utm.easting, utm.northing, 0));
                            track.addObject(v);
                            if (lastVert)
                                track.addEdge(new Edge(lastVert, v));
                            lastVert = v;
                        }
                    });
                    tracks.push(track);
                });
            });
            return { objects: tracks };
        }
    }
    return GPX;
});

