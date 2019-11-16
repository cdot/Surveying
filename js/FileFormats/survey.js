define("js/FileFormats/survey", ["js/FileFormats/XML", "three", "js/UTM", "js/Point", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/ImagePlane", "js/Survey"], function(XML, Three, UTM, Point, Vertex, Edge, Container, Network, ImagePlane, Survey) {

    class SURVEY extends XML {

        constructor() {
            super("survey");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);
            let vid2vertex = {};
            
            function getPoint($el) {
                let lat = parseFloat($el.attr("lat"));
                let lon = parseFloat($el.attr("lon"));
                let d = parseFloat($el.attr("depth"));
                let utm = UTM.fromLatLong(lat, lon);
                return new Three.Vector3(utm.easting, utm.northing, d);
            }
            
            function xml2db($nd) {
                let name = $nd.attr("name");
                let tag = $nd.prop("tagName");
                switch (tag) {
                case "point":
                    return new Point(name, getPoint($nd));
                case "vertex": {
                    let v = new Vertex(name, getPoint($nd));
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
                            net.addChild(xml2db($(this)));
                    });
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
                let utm = new UTM(p.x, p.y).toLatLong();
                dd.setAttribute("lat", utm.latitude);
                dd.setAttribute("lon", utm.longitude);
                dd.setAttribute("depth", p.z);
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
                case "Vertex":
                    dom = doc.createElement("vertex");
                    dom.setAttribute("id", visual.vid);
                    putPoint(visual.position, dom);
                    break;
                case "Edge":
                    dom = doc.createElement("edge");
                    dom.setAttribute("p1", visual.p1.vid);
                    dom.setAttribute("p2", visual.p2.vid);
                    break;
                case "Network":
                    dom = doc.createElement("network");
                    for (let g of visual.children)
                        dom.append(db2xml(g, doc));
                    for (let e of visual.edges)
                        dom.append(db2xml(e, doc));
                    break;
                case "Container":
                    dom = doc.createElement("container");                   
                    for (let g of visual.children)
                        dom.append(db2xml(g, doc));
                    break;
                case "Survey":
                    dom = doc.createElement("survey");
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

