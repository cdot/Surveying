/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/FileFormats/survey", ["js/FileFormats/XML", "three", "js/UTM", "js/Point", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/Contour", "js/ImagePlane"], function(XML, Three, UTM, Point, Vertex, Edge, Container, Network, Contour, ImagePlane) {

    class SURVEY extends XML {

        constructor() {
            super("survey");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);
            let vid2vertex = {};
            let utm_zone = $xml.find("survey").attr("utm_zone");
            if (utm_zone) {
                if (UTM.defaultZone() && UTM.defaultZone() !== utm_zone)
                    changeZone = true;
            }
   
            function getPoint($el) {
                let x, y, z;
                if ($el.attr("x")) {
                    x = parseFloat($el.attr("x")),
                    y = parseFloat($el.attr("y"));
                    if (changeZone) {
                        let utm = new UTM(x, y, utm_zone);
                        utm.changeZone(UTM.defaultZone());
                        x = utm.easting, y = utm.northing;
                    }
                } else {
                    let utm = UTM.fromLatLong(parseFloat($el.attr("lat")),
                                              parseFloat($el.attr("lon")));
                    x = utm.easting, y = utm.northing;
                }
                if ($el.attr("z"))
                    z = parseFloat($el.attr("z"));
                else
                    z = -parseFloat($el.attr("depth"));
                return new Three.Vector3(x, y, z);
            }
            
            function xml2db($nd) {
                let name = $nd.attr("name");
                let tag = $nd.prop("tagName");
                let p;
                switch (tag) {
                case "point":
                    return new Point(getPoint($nd), name);
                case "vertex": {
                    let v = new Vertex(getPoint($nd));
                    vid2vertex[$nd.attr("id")] = v;
                    return v;
                }
                case "image":
                    return new ImagePlane(
                        $nd.attr("filename"),
                        getPoint($nd.children("min").first()),
                        getPoint($nd.children("max").first()));
                case "edge": {
                    let n1 = vid2vertex[$nd.attr("p1")];
                    if (!n1)
                        throw new Error("Corrupt survey; " + n1 + " missing");
                    let n2 = vid2vertex[$nd.attr("p2")];
                    if (!n2)
                        throw new Error("Corrupt survey; " + n2 + " missing");
                    return new Edge(n1, n2);
                }
                case "network": {
                    let net = new Network(name);
                    $nd.children().each(function() {
                        let kid = xml2db($(this));
                        if (kid instanceof Edge)
                            net.addEdge(kid);
                        else
                            net.addChild(kid);
                    });
                }
                case "contour": {
                    let path = new Contour(name);
                    let firstV, lastV;
                    $nd.children().each(function() {
                        let v = xml2db($(this));
                        path.addChild(v);
                        if (!firstV)
                            firstV = v;
                        if (lastV)
                            path.addEdge(lastV, v);
                        lastV = v;
                    });
                    if (firstV && lastV)
                        path.addEdge(lastV, firstV);
                }
                case "survey":
                    // A root level survey is added as a container
                case "container":
                    let container = new Container(name);
                    $nd.children().each(function() {
                        container.addChild(xml2db($(this)));
                    });
                    return container;
                default:
                    throw new Error("Unrecognised entity " + tag);
                }
            }
            return Promise.resolve(xml2db($xml));
        }

        save(survey) {
            function putPoint(p, dd) {
                dd.setAttribute("x", p.x);
                dd.setAttribute("y", p.y);
                dd.setAttribute("z", p.z);
                /*let ll = new UTM(p.x, p.y).toLatLong();
                  dd.setAttribute("lat", ll.latitude);
                  dd.setAttribute("lon", ll.longitude);
                  dd.setAttribute("depth", -p.z);*/
                return dd;
            }
            
            function db2xml(visual, doc) {
                let dom, bb;

                switch (visual.constructor.name) {
                case "ImagePlane":
                    dom = doc.createElement("image");
                    dom.setAttribute("filename", visual.filename);
                    bb = visual.boundingBox;
                    dom.append(putPoint(bb.min, doc.createElement("min")));
                    dom.append(putPoint(bb.max, doc.createElement("max")));
                    break;
                case "Point":
                    dom = doc.createElement("point");
                    putPoint(visual.position, dom);
                    break;
                case "Edge":
                    dom = doc.createElement("edge");
                    dom.setAttribute("p1", visual.p1.vid);
                    dom.setAttribute("p2", visual.p2.vid);
                    break;
                case "Network":
                    dom = doc.createElement("network");
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("id", g.vid);
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        d.setAttribute("z", g.position.z);
                        dom.append(d);
                    }
                    for (let e of visual.edges)
                        dom.append(db2xml(e, doc));
                    break;
                case "Path": {
                    // A path is a chain of vertices that may be closed
                    // Don't need to save edges
                    dom = doc.createElement("path");
                    dom.setAttribute("closed", visual.isClosed);
                    let v = [];
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        d.setAttribute("z", g.position.z);
                        dom.append(d);
                    }
                    break;
                }
                case "Contour": {
                    // A contour is a closed loop, don't need to save
                    // edges
                    dom = doc.createElement("contour");
                    dom.setAttribute("z", visual.children[0].position.z);
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        dom.append(d);
                    }
                    break;
                }
                case "Container":
                    dom = doc.createElement(
                        visual.parent ? "container" : "survey");
                    for (let g of visual.children)
                        dom.append(db2xml(g, doc));
                    break;
                default:
                    throw new Error(
                        "Unsupported Visual " + visual.constructor.name);
                }
                if (visual.name)
                    dom.setAttribute("name", visual.name);
                return dom;
            }

            let doc = document.implementation.createDocument("", "", null);

            let dom;
            // A survey is a collection of containers, each of which was
            // potentially loaded from a survey. If we were to save a survey
            // A, then load it, it would load as a container within a new
            // survey, B. Repeated saves and loads would each layer another
            // survey. This special case handles that by saving a single
            // container as the survey itself.
            if (survey.children.length === 1
                && survey.children[0].constructor.name === "Container") {
                // root has a single child, promote it to root and save it
                // as a survey
                let root = survey.children[0];
                dom = doc.createElement("survey");
                if (root.name)
                    dom.setAttribute("name", root.name);
                dom.setAttribute("utm_zone", UTM.defaultZone());
                for (let c of root.children)
                    dom.append(db2xml(c, doc));
            } else // root has multiple children
                dom = db2xml(survey, doc);

            doc.append(dom);
            return '<?xml version="1.0" encoding="UTF-8"?>'
                +  new XMLSerializer().serializeToString(doc);
        }

    }
    return SURVEY;
});

