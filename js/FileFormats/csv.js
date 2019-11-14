define("js/FileFormats/csv", ["three", "js/Vertex", "js/Edge", "js/Network", "js/Container", "jquery-csv"], function(Three, Vertex, Edge, Network, Container) {

    /**
     * Load a point series from a CSV file into a network.
     * Column headings Time, Lat, Long, and Depth are expected
     */
    class CSV extends FileFormat {

        // @Override FileFormat
        load(source, data) {
            this.setSource(source);

            let table = $.csv.toArrays(data);
            let nets = new Container(source);

            let network;
            let heads = [];
            let last_vertex;
            for (let row of table) {
                if (heads.length === 0) {
                    // First row always provides the headings
                    for (let h of row) {
                        if (/^lat/i.test(h))
                            heads.push("lat");
                        else if (/^lon/i.test(h))
                            heads.push("lon");
                        else if (/^depth/i.test(h))
                            heads.push("depth");
                        else if (/^(time|date)/i.test(h))
                            heads.push("time");
                        else if (/^(name|point|id)/i.test(h))
                            heads.push("name");
                    }
                } else if (row.length < heads.length) {
                    nets.push(network);
                    network = new Network(row[0] || this.nextNet());
                } else {
                    if (!network) {
                        network = new Network(this.nextNet());
                        nets.push(network);
                    }
                    // Data row
                    let r = {};
                    // For each column
                    for (let h in heads) {
                        try {
                            r[heads[h]] = parseFloat(row[h]);
                            if (isNaN(r[heads[h]]))
                                r[heads[h]] = row[h];
                        } catch (e) {
                            // Otherwise copy the string
                            r[heads[h]] = row[h];
                        }
                    }
                    let point = new Three.Vector3(r.lon, r.lat, r.depth);
                    let v = new Vertex(r.name | r.time, point);
                    network.addChild(v);
                    if (last_vertex)
                        network.addEdge(new Edge(last_vertex, v));
                    last_vertex = v;
                }
            }
            return Promise.resolve(nets);
        }
    }

    return CSV;
});

