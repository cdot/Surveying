/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery */

define("js/FileFormats/csv", ["js/FileFormat", "three", "js/Units", "js/POI", "js/Sounding", "js/Container", "jquery-csv"], function(FileFormat, Three, Units, POI, Sounding, Container) {

    /**
     * Load a set of points of interest from a CSV file into a container.
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
                        if (/^lat/iu.test(h))
                            heads.push("lat");
                        else if (/^lon/iu.test(h))
                            heads.push("lon");
                        else if (/^depth/iu.test(h))
                            heads.push("depth");
                        else if (/^(time|date)/iu.test(h))
                            heads.push("time");
                        else if (/^(name|point|id)/iu.test(h))
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
                    let i = Units.convert(Units.LATLON, r, Units.IN);
                    i.z = -r.depth;
                    let v = new POI(i, r.name || r.time);
                    group.addChild(v);
                }
            }
            return Promise.resolve(group);
        }

        /**
         * Generate a string containing CSV formatted data for the points in
         * the visual. Only points are saved; paths and contours are lost.
         */
        save(root) {
            let s = ["Name,Lat,Lon,Depth"];

            // UPM only relevant for depths
            Units.mapToEX(root.boundingBox, 1, false);

            function db2csv(visual) {
                if (visual instanceof POI || visual instanceof Sounding) {
                    let p = Units.convert(
                        Units.IN, visual.position, Units.LATLON);
                    let d = Units.convert(
                        Units.IN, visual.position, Units.EX);
                    s.push([`"${visual.name}"`, p.lat, p.lon, -d.z].join(","));
                }
                else if (visual.children) {
                    for (let g of visual.children)
                        db2csv(g);
                }
            }

            db2csv(root);

            return s.join("\n");
        }
    }

    return CSV;
});

