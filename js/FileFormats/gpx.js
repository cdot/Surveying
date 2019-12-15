/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */

define("js/FileFormats/gpx", ["js/FileFormats/XML", "three", "js/Path", "js/Container", "js/Units"], function(XML, Three, Path, Container, Units) {

    let counter = 0;

    class GPX extends XML {

        constructor() {
            super("gpx");
        }

        // @Override FileFormat
        load(source, data) {
            let $xml = this.parse(source, data);

            let tracks = new Container(source);
            $xml.children("trk").each(function() {
                let $trk = $(this);
                $trk.children("trkseg").each(function() {
                    let $seg = $(this);
                    let id = counter++;
                    console.debug("Loading track", id);
                    let track = new Path(id);
                    let lastLat = NaN;
                    let lastLon = NaN;
                    $seg.children("trkpt").each(function() {
                        let $tpt = $(this);
                        let lat = parseFloat($tpt.attr("lat"));
                        let lon = parseFloat($tpt.attr("lon"));
                        if (lat !== lastLat || lon !== lastLon) {
                            lastLat = lat;
                            lastLon = lon;
                            track.addVertex(Units.convert(
                                Units.LATLON,
                                { lon: lon, lat: lat },
                                Units.IN));
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

