/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/json", ["js/FileFormat", "three", "js/Units", "js/Point", "js/Container", "js/Network", "js/Path", "js/Contour"], function(FileFormat, Three, Units, Point, Container, Network, Path, Contour) {

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
            
            function json2db(json) {
                let visual, c;
                
                switch (json.type) {

                case "point":
                    visual = new Point(e2i({
                        x: json.v[0],
                        y: json.v[1],
                        z: json.v[2]}), json.name);
                    break;

                case "network": {
                    let visual = new Network(json.name);
                    for (c = 0; c < json.v.length; c += 3)
                        visual.addVertex(e2i({x: json.v[c],
                                              y: json.v[c + 1],
                                              z: json.v[c + 2]}));
                    for (c = 0; c < json.e.length; c += 2)
                        visual.addEdge(
                            visual.children[c], visual.children[c + 1]);
                    break;
                }
                case "path":
                    visual = new Path(json.name);
                    for (c = 0; c < json.v.length; c += 3)
                        visual.addVertex(e2i({x: json.v[c],
                                              y: json.v[c + 1],
                                              z: json.v[c + 2]}));
                    if (json.closed)
                        visual.close();
                    break;

                case "contour":
                    visual = new Contour(json.name);
                    for (c = 0; c < json.v.length; c += 2)
                        visual.addVertex(e2i({x: json.v[c],
                                              y: json.v[c + 1]}));
                    visual.setZ(json.z);
                    visual.close();
                    break;

                case "container":
                    visual = new Container(json.name);
                    for (let c of json.children)
                        visual.addChild(json2db(c));
                    break;
                    
                default:
                    throw new Error("Unrecognised entity " + json.type);
                }

                return visual;
            }
            return Promise.resolve(json2db(json));
        }

        // Save
        
        save(visual) {
            
            function db2json(visual) {
                let type = visual.constructor.name;
                    
                if (type === "Point") {
                    let p = visual.position;
                    return {
                        type: "point",
                        name: visual.name,
                        v: [ round(p.x), round(p.y), round(p.z) ]
                    };
                }
                    
                if (type === "Network") {
                    let el = {
                        type: "network",
                        name: visual.name,
                        v: [],
                        e: []
                    };
                    let vid2i = {};
                    let i = 0;
                    for (let g of visual.children) {
                        vid2i[g.vid] = el.children.length;
                        el.v.push(
                            round(g.position.x),
                            round(g.position.y),
                            round(g.position.z));
                    }
                    for (let e of visual.edges)
                        el.e.push(vid2i[e.p1.vid], vid2i[e.p2.vid]);
                    return el;
                }
                    
                if (type === "Path") {
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
                    
                if (type === "Contour") {
                    // A contour is a closed loop, don't need to save
                    // edges
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
                    
                if (type === "Container") {
                    let el = {
                        type: "container",
                        name: visual.name,
                        children: [] };
                    for (let g of visual.children)
                        el.children.push(db2json(g));
                    return el;
                }
                    
                throw new Error(
                    "Unsupported Visual " + type);
                    
            }

            // A survey is a collection of containers, each of which was
            // potentially loaded from a survey. If we were to save a survey
            // A, then load it, it would load as a container within a new
            // survey, B. Repeated saves and loads would each layer another
            // survey. This special case handles that by saving a single
            // container as the survey itself.
            let json;
            if (visual.children.length === 1
                && visual.children[0].constructor.name === "Container")
                // root has a single child, promote it to root
                json = db2json(visual.children[0]);
            else // root has multiple children
                json = db2jsonl(visual);

            json.bb = visual.boundingBox;
            json.upm = Units.UPM[Units.IN];
            json.origin = Units.inOrigin;
            
            return JSON.stringify(json);
        }

    }
    return Json;
});

