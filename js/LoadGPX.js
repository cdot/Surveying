define("js/LoadGPX", ["three", "js/Vertex", "js/Edge", "js/Network"], function(Three, Vertex, Edge, Network) {

    /**
     * Load tracks from a GPX dom into networks.
     * @param DOM for the XML of an OSM file, load using DOMParser
     * @return an array of Network
     */
    return dom => {
        let nets = [];
        for (let track of dom.getElementsByTagName("trk")) {
            let id = track.getElementsByTagName("name");
            let net = new Network(id.length > 0 ? id[0].textContent : "unknown");
            for (let seg of track.getElementsByTagName("trkseg")) {
                let lastVert, lastLat = NaN, lastLon = NaN;
                for (let tpt of seg.getElementsByTagName("trkpt")) {
                    let lat = parseFloat(tpt.getAttribute("lat"));
                    let lon = parseFloat(tpt.getAttribute("lon"));
                    if (lat === lastLat && lon === lastLon)
                        // TODO: record number of hits on this point
                        continue;
                    lastLat = lat; lastLon = lon;
                    let time = tpt.getElementsByTagName("time")[0].textContent;
                    let point = new Three.Vector3(lon, lat, 0);
                    let v = new Vertex(time, point);
                    net.addVertex(v);
                    if (lastVert)
                        net.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                }
            }
            nets.push(net);
        }
        return nets;
    };
});

