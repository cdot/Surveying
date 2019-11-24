/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/FileFormats/gpx", ["js/FileFormats/XML", "three", "js/Vertex", "js/Path", "js/Container", "js/UTM"], function(XML, Three, Vertex, Path, Container, UTM) {

    let counter = 0;
    
    class GPX extends XML {

        constructor() {
            super("gpx");
        }

        // @Override FileFormat
        load(source, data) {
            let $xml = this.parse(source, data);

            let tracks = new Container(source);
            let loader = this;
            let zone;
            $xml.children("trk").each(function() {
                let $trk = $(this);
                $trk.children("trkseg").each(function() {
                    let $seg = $(this);
                    let id = counter++;
                    console.debug("Loading track", id);
                    let track = new Path(id);
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
                            let v = track.addVertex(
                                {x: utm.easting, y: utm.northing, z: 0});
                            track.addChild(v);
                            if (lastVert)
                                track.addEdge(lastVert, v);
                            lastVert = v;
                        }
                    });
                    tracks.addChild(track);
                });
            });
            return Promise.resolve(tracks);
        }
    }
    return GPX;
});

