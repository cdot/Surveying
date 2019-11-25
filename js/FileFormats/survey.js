/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/FileFormats/survey", ["js/FileFormats/XML", "three", "js/UTM", "js/Point", "js/Vertex", "js/Container", "js/Network", "js/Path", "js/Contour", "js/ImagePlane"], function(XML, Three, UTM, Point, Vertex, Container, Network, Path, Contour, ImagePlane) {

    class SURVEY extends XML {

        constructor() {
            super("survey");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);
            let vid2vertex = {};
            let utm_zone = $xml.find("survey").attr("utm_zone");
            let changeZone = false;
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
                let visual;
                
                switch (tag) {

                case "point":
                    visual = new Point(getPoint($nd), name);
                    break;

                case "image":
                    visual = new ImagePlane(
                        $nd.attr("url"),
                        parseFloat($nd.attr("width")),
                        parseFloat($nd.attr("height")),
                        JSON.parse($nd.attr("transform")));
                    break;
                    
                case "network": {
                    let visual = new Network(name);
                    $nd.children().each(function() {
                        
                        switch ($nd.prop("tagName")) {
                            
                        case "e": { // Edge
                            let n1 = vid2vertex[$nd.attr("p1")];
                            if (!n1)
                                throw new Error("Corrupt survey; "
                                                + n1 + " missing");
                            let n2 = vid2vertex[$nd.attr("p2")];
                            if (!n2)
                                throw new Error("Corrupt survey; "
                                                + n2 + " missing");
                            visual.addEdge(n1, n2);
                            break;
                        }
                        case "v": { // Vertex
                            let v = new Vertex(getPoint($nd));
                            vid2vertex[$nd.attr("id")] = v;
                            visual.addChild(v);
                            break;
                        }
                        default:
                            throw new Error(
                                "Corrupt survey; " + name
                                + " has a " + $nd.prop("tagName"));
                        }
                    });
                    break;
                }
                case "path":
                    visual = new Path(name);
                    $nd.children().each(function() {
                        let $v = $(this);
                        visual.addVertex({
                            x: parseFloat($v.attr("x")),
                            y: parseFloat($v.attr("y")),
                            z: parseFloat($v.attr("z"))
                        });
                    });
                    if ($nd.attr("closed") === "true")
                        visual.close();
                    break;

                case "contour":
                    visual = new Contour(name);
                    visual.setZ(parseFloat($nd.attr("z")));
                    $nd.children().each(function() {
                        let $v = $(this);
                        visual.addVertex({x: parseFloat($v.attr("x")),
                                           y: parseFloat($v.attr("y"))});
                    });
                    visual.close();
                    break;

                case "survey":
                    // A root level survey is added as a container

                case "container":
                    visual = new Container(name);
                    $nd.children().each(function() {
                        visual.addChild(xml2db($(this)));
                    });
                    break;
                    
                default:
                    throw new Error("Unrecognised entity " + tag);
                }

                return visual;
            }
            return Promise.resolve(xml2db($xml));
        }

        // Save
        
        save(survey) {
            
            function db2xml(visual, doc) {
                let xml;

                switch (visual.constructor.name) {
                    
                case "ImagePlane": {
                    xml = doc.createElement("image");
                    xml.setAttribute("url", visual.filename);
                    xml.setAttribute("width",visual.width);
                    xml.setAttribute("height", visual.height);
                    xml.setAttribute(JSON.stringify(visual.transform));
                    break;
                }
                    
                case "Point": {
                    xml = doc.createElement("point");
                    let p = visual.position;
                    xml.setAttribute("x", p.x);
                    xml.setAttribute("y", p.y);
                    xml.setAttribute("z", p.z);
                    break;
                }
                    
                case "Network": {
                    xml = doc.createElement("network");
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("id", g.vid);
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        d.setAttribute("z", g.position.z);
                        xml.append(d);
                    }
                    for (let e of visual.edges) {
                        let exml = doc.createElement("e");
                        exml.setAttribute("a", e.p1.vid);
                        exml.setAttribute("b", e.p2.vid);
                        xml.append(exml);
                    }
                    break;
                }
                    
                case "Path": {
                    // A path is a chain of vertices that may be closed
                    // Don't need to save edges
                    xml = doc.createElement("path");
                    xml.setAttribute("closed", visual.isClosed);
                    let v = [];
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        d.setAttribute("z", g.position.z);
                        xml.append(d);
                    }
                    break;
                }
                    
                case "Contour": {
                    // A contour is a closed loop, don't need to save
                    // edges
                    xml = doc.createElement("contour");
                    xml.setAttribute("z", visual.children[0].position.z);
                    for (let g of visual.children) {
                        let d = doc.createElement("v");
                        d.setAttribute("x", g.position.x);
                        d.setAttribute("y", g.position.y);
                        xml.append(d);
                    }
                    break;
                }
                    
                case "Container": {
                    xml = doc.createElement(
                        visual.parent ? "container" : "survey");
                    for (let g of visual.children)
                        xml.append(db2xml(g, doc));
                    break;
                }
                    
                default:
                    throw new Error(
                        "Unsupported Visual " + visual.constructor.name);
                    
                }
                
                if (visual.name)
                    xml.setAttribute("name", visual.name);
                
                return xml;
            }

            let doc = document.implementation.createDocument("", "", null);

            // A survey is a collection of containers, each of which was
            // potentially loaded from a survey. If we were to save a survey
            // A, then load it, it would load as a container within a new
            // survey, B. Repeated saves and loads would each layer another
            // survey. This special case handles that by saving a single
            // container as the survey itself.

            let xml;
            if (survey.children.length === 1
                && survey.children[0].constructor.name === "Container") {
                // root has a single child, promote it to root and save it
                // as a survey
                let root = survey.children[0];
                xml = doc.createElement("survey");
                if (root.name)
                    xml.setAttribute("name", root.name);
                for (let c of root.children)
                    xml.append(db2xml(c, doc));
            } else { // root has multiple children
                xml = db2xml(survey, doc);
            }
            xml.setAttribute("utm_zone", UTM.defaultZone());
            doc.append(xml);
            
            return '<?xml version="1.0" encoding="UTF-8"?>'
                +  new XMLSerializer().serializeToString(doc);
        }

    }
    return SURVEY;
});

