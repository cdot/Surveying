/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/json", ["js/FileFormat", "three", "js/UTM", "js/Point", "js/Vertex", "js/Container", "js/Network", "js/Path", "js/Contour"], function(FileFormat, Three, UTM, Point, Vertex, Container, Network, Path, Contour) {

    class Json extends FileFormat {

        constructor() {
            super("json");
        }

        // @Override
        load(source, data) {
            let json = JSON.parse(data);
            let utm_zone = json.utm_zone;
            let changeZone = false;
            if (utm_zone) {
                if (UTM.defaultZone() && UTM.defaultZone() !== utm_zone)
                    changeZone = true;
            }
   
            function getPoint(el) {
                if (changeZone) {
                    let utm = new UTM(el.x, el.y, utm_zone);
                    utm.changeZone(UTM.defaultZone());
                    el.x = utm.easting, el.y = utm.northing;
                }
                return el;
            }
            
            function json2db(json) {
                let tag = json.type;
                let visual;
                
                switch (tag) {

                case "point":
                    visual = new Point(getPoint(json), json.name);
                    break;

                case "network": {
                    let visual = new Network(json.name);
                    for (let c of json.v)
                        visual.addVertex(getPoint(c));
                    for (let e of json.e) {
                        visual.addEdge(
                            visual.children[e.a],
                            visual.children[e.b]);
                    }
                    break;
                }
                case "path":
                    visual = new Path(json.name);
                    for (let v of json.v)
                        visual.addVertex(getPoint(v));
                    if (json.closed)
                        visual.close();
                    break;

                case "contour":
                    visual = new Contour(json.name);
                    visual.setZ(json.z);
                    for (let v of json.v) {
                        v.z = json.z;
                        visual.addVertex(getPoint(v));
                    }
                    visual.close();
                    break;

                case "container":
                    visual = new Container(json.name);
                    for (let c of json.children)
                        visual.addChild(json2db(c));
                    break;
                    
                default:
                    throw new Error("Unrecognised entity " + tag);
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
                        x: p.x,
                        y: p.y,
                        z: p.z };
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
                        el.v.push({
                            x: g.position.x,
                            y: g.position.y,
                            z: g.position.z});
                    }
                    for (let e of visual.edges) {
                        el.e.push({
                            a: vid2i[e.p1.vid],
                            b: vid2i[e.p2.vid]});
                    }
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
                        el.v.push({
                            x: g.position.x,
                            y: g.position.y,
                            z: g.position.z});
                    }
                    return el;
                }
                    
                if (type === "Contour") {
                    // A contour is a closed loop, don't need to save
                    // edges
                    let el = {
                        type: "contour",
                        name: visual.name,
                        z: visual.z,
                        v: []
                    };
                    for (let g of visual.children) {
                        el.v.push({
                            x: g.position.x,
                            y: g.position.y});
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
            json.utm_zone = UTM.defaultZone();
            
            return JSON.stringify(json);
        }

    }
    return Json;
});

