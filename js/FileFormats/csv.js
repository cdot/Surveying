/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/csv", ["js/FileFormat", "three", "js/Point", "js/Container", "js/UTM", "jquery-csv"], function(FileFormat, Three, Point, Container, UTM) {

    /**
     * Load a set of points from a CSV file into a container.
     * Column headings Time, Lat, Long, and Depth are expected
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
                    let utm = UTM.fromLatLong(r.lat, r.lon);
                    let v = new Point(
                        {x: utm.easting, y: utm.northing, z: -r.depth},
                        r.name | r.time);
                    group.addChild(v);
                }
            }
            return Promise.resolve(group);
        }
    }

    return CSV;
});

