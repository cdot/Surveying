define("js/Loaders/Text/csv", ["three", "js/Vertex", "js/Network"], function(Three, Vertex, Network) {

    /**
     * Load a point series from a CSV file into a network.
     * Column headings Time, Lat, Long, and Depth are expected
     */
    return data => {
        requirejs(["jquery-csv"], function() {
            let network = new Network("csv");
            let data = $.csv.toArrays(resource);
            let heads;
            let rows = [];
            let last_vertex;
            for (let row of data) {
                if (!heads)
                    // First row always provides the headings
                    heads = row;
                else {
                    // Data row
                    let r = {};
                    for (let h in heads) {
                        if (/^-?[0-9.]+$/.test(row[h]))
                            // Recognisable number. parse it
                            r[heads[h]] = parseFloat(row[h]);
                        else
                            // Otherwise copy the string
                            r[heads[h]] = row[h];
                    }
                    let point = new Three.Vector3(r.Lat, r.Long, r.Depth);
                    let v = new Vertex(r.Time, point);
                    network.addVertex(v);
                    if (last_vertex)
                        network.addEdge(new Edge(last_vertex, v));
                    last_vertex = v;
                }
            }
            superNet.addSubnet(network);
        });
    };
});

