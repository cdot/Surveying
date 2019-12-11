/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/csv", ["js/FileFormat", "three", "js/Units", "js/Point", "js/Container", "jquery-csv"], function(FileFormat, Three, Units, Point, Container) {

    /**
     * Load a set of points from a CSV file into a container.
     * Column headings Name, Lat, Lon, and Depth are expected
     */
    class CSV extends FileFormat {

        // @Override FileFormat
        load(source, data) {
            this.setSource(source);

            let table = $.csv.toArrays(data);
            let group = new Container(source);

            let heads = [];
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
                    continue;
                }

                if (row.length >= heads.length) {
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
                    let i = Units.convert(Units.LONLAT, r, Units.IN);
                    i.z = -r.depth;
                    let v = new Point(i, r.name | r.time);
                    group.addChild(v);
                }
            }
            return Promise.resolve(group);
        }

        /**
         * Generate a string containing CSV formatted data for the points in
         * the visual. Only points are saved; paths and contours are lost.
         */
        save(visual) {
            let s = [ "Name,Lat,Lon,Depth" ];
            
            function db2csv(visual) {
                let type = visual.constructor.name;
                    
                if (type === "Point") {
                    let p = Units.convert(Units.IN, visual.position, Units.LONLAT);
                    s.push([
                        '"' + visual.name + '"',
                        p.lat, p.lon,
                        visual.position.z / Units.UPM[Units.IN]
                    ].join(","));
                }
                else if (type === "Container") {
                    for (let g of visual.children)
                        db2csv(g);
                }
            }

            db2csv(visual);
            
            return s.join("\n");
        }
    }

    return CSV;
});

