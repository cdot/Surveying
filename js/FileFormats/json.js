/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/json", ["js/FileFormat", "three", "js/Units", "js/Container", "js/Path", "js/Contour", "js/POI", "js/Sounding"], function(FileFormat, Three, Units, Container, Path, Contour, POI, Sounding) {

    // 1 = round to 0 decimal places. Since the internal coordinate system
    // is in millimetres, 0 should give us more than enough accuracy.
    // This can be increased if more accuracy is required
    const ROUNDER = 1;

    function round(n) {
        return Math.round(n * ROUNDER) / ROUNDER;
    }

    class Json extends FileFormat {

        constructor() {
            super("json");
        }

        // @Override
        load(source, data) {
            let json = JSON.parse(data);

            Units.mapFromEX(json.bb, json.upm, false);

            if (!Units.inOrigin)
                Units.inOrigin = json.origin;

            function e2i(el) {
                return Units.convert(Units.EX, el, Units.IN);
            }

            function json2db(js) {
                let visual, c;

                switch (js.type) {

                case "poi":
                    visual = new POI(e2i({
                        x: js.v[0],
                        y: js.v[1],
                        z: js.v[2]
                    }), js.name);
                    break;

                case "sounding":
                    visual = new Sounding(e2i({
                        x: js.v[0],
                        y: js.v[1],
                        z: js.v[2]
                    }), js.name);
                    break;

                case "path":
                    visual = new Path(js.name);
                    for (c = 0; c < js.v.length; c += 3)
                        visual.addVertex(e2i({
                            x: js.v[c],
                            y: js.v[c + 1],
                            z: js.v[c + 2]
                        }));
                    if (js.closed)
                        visual.close();
                    break;

                case "contour":
                    visual = new Contour(js.name);
                    for (c = 0; c < js.v.length; c += 2)
                        visual.addVertex(e2i({
                            x: js.v[c],
                            y: js.v[c + 1]
                        }));
                    visual.setZ(js.z);
                    visual.close();
                    break;

                case "container":
                    visual = new Container(js.name);
                    for (let brat of js.children)
                        visual.addChild(json2db(brat));
                    break;

                default:
                    throw new Error(`Unrecognised entity ${js.type}`);
                }

                return visual;
            }
            return Promise.resolve(json2db(json));
        }

        // Save

        save(root) {

            function db2json(visual) {

                if (visual instanceof POI) {
                    let p = visual.position;
                    return {
                        type: "poi",
                        name: visual.name,
                        v: [round(p.x), round(p.y), round(p.z)]
                    };
                }

                if (visual instanceof Sounding) {
                    let p = visual.position;
                    return {
                        type: "sounding",
                        name: visual.name,
                        v: [round(p.x), round(p.y), round(p.z)]
                    };
                }

                if (visual instanceof Contour) {
                    // A contour is a closed loop, don't need to save
                    // edges. Also handles Sounding (which is just a
                    // Contour with a single vertex)
                    let el = {
                        type: "contour",
                        name: visual.name,
                        z: round(visual.z),
                        v: []
                    };
                    for (let g of visual.children) {
                        el.v.push(round(g.position.x), round(g.position.y));
                    }
                    return el;
                }

                if (visual instanceof Path) {
                    // A path is a chain of vertices that may be closed
                    // Don't need to save edges
                    let el = {
                        type: "path",
                        name: visual.name,
                        closed: visual.isClosed,
                        v: []
                    };
                    for (let g of visual.children) {
                        el.v.push(
                            round(g.position.x),
                            round(g.position.y),
                            round(g.position.z));
                    }
                    return el;
                }

                if (visual instanceof Container) {
                    let el = {
                        type: "container",
                        name: visual.name,
                        children: []
                    };
                    for (let g of visual.children)
                        el.children.push(db2json(g));
                    return el;
                }

                throw new Error(
                    `Unsupported Visual ${visual.constructor.name}`);

            }

            // A survey is a collection of containers, each of which was
            // potentially loaded from a survey. If we were to save a survey
            // A, then load it, it would load as a container within a new
            // survey, B. Repeated saves and loads would each layer another
            // survey. This special case handles that by saving a single
            // container as the survey itself.
            let json;
            if (root.children.length === 1
                && root.children[0].constructor.name === "Container")
                // root has a single child, promote it to root
                json = db2json(root.children[0]);
            else // root has multiple children
                json = db2json(root);

            json.bb = root.boundingBox;
            json.upm = Units.UPM[Units.IN];
            json.origin = Units.inOrigin;

            return JSON.stringify(json);
        }

    }
    return Json;
});

