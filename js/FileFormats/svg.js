define("js/FileFormats/svg", ["js/FileFormats/XML", "three", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/ImagePlane", "js/UTM"], function(XML, Three, Vertex, Edge, Container, Network, ImagePlane, UTM) {

    /**
     * Specialised loader for an SVG used to carry survey information.
     * There are a number of standards that must be observed for a survey
     * SVG. First, there must be document metadata containing a "dc:description"
     * that carries attribute values in JSON as follows:
     * {
     *   reference { x:, y:       // location of the reference point in SVG units
     *               lat:, lon: } // real world location of the reference point,
     *                            // in decimal degrees
     *   resolution: // resolution in SVG units per metre
     * }
     * The JSON block must be the first thing in the description. The rest
     * of the description is ignored.
     * The resolution defines how many SVG file units are in a real metre.
     * So a resolution of 10 says there are 10 units per metre. The actual
     * unit system used in the document is a matter of personal choice.
     * The origin of the document is the top-left corner (and not, as you
     * might expect, the bottom left!)
     * Only paths and images are read from the document. Other graphical
     * objects are ignored.
     * Images should be linked in the SVG. The last path component of the
     * image URL path is appended to "data/" to retrieve the image data
     * relative to the application.
     */
    
    function applySVGTransforms(transforms, net) {
        if (!transforms) return;
        let mat = new Three.Matrix3();
        let step = new Three.Matrix3();
        let txs = transforms.split(/(\w+\(.*?\))/);
        for (let tx of txs) {
            if (/^\w+\(.*?\)/.test(tx)) {
                let parts = tx.split(/[(, ]+/);
                let fn = parts.shift();
                let vs = [];
                for (let p of parts)
                    vs.push(parseFloat(p));
                switch(fn) {
                case "matrix":
                    //[a c e]
                    //[b d f]
                    step.set(vs[0], vs[2], vs[4],
                             vs[1], vs[3], vs[5],
                             0, 0, 1);
                    mat.multiply(step);
                    break;
                    
                case "rotate":
                    rot = -vs[0] * Math.PI / 180;
                    if (vs.length === 3) {
                        step.set(1, 0, -vs[1],
                                 0, 1, -vs[2],
                                 0, 0, 1);
                        mat.multiply(step);
                    }
                    step.set(Math.cos(rot), -Math.sin(rot), 0,
                             Math.sin(rot), Math.cos(rot), 0,
                             0, 0, 1);
                    mat.multiply(step);
                    if (vs.length === 3) {
                        step.set(1, 0, vs[1],
                                 0, 1, vs[2],
                                 0, 0, 1);
                        mat.multiple(step);
                    }
                    break;
                    
                case "translate":
                    step.set(1, 0, vs[0],
                             0, 1, vs[1],
                             0, 0, 1);
                    mat.mutliply(step);
                    break;

                case "scale":
                    if (vs.length === 1)
                        vs[1] = vs[0];
                    step.set(1, 0, 0,
                             0, 1, 0,
                             vs[0], vs[1], 1);
                    mat.multiply(step);
                    break;
                default:
                    console.error("transform not supported:", fn);
                }
            }
        }
        net.applyTransform(mat);
    }

    class SVG extends XML {

        constructor() {
            super("svg");
            let loader = this;
            $.ajax({
                url: "templates/svg.svg",
                success: function(data, status, jqXHR) {
                    loader.mTemplate = data;
                },
                dataType: "xml" });
        }

        loadPath($path, attrs) {
            let $title = $path.children("title");
            let id = $title.text() || $path.attr("id") || this.nextNet();
            console.debug("Loading path", id);
            let path = new Network(id);
            let pos = new Three.Vector3(0, 0, attrs.depth);

            let cmd, j;
            function addVert(vx) {
                let v = new Vertex(id + ":" + cmd + j++, vx.clone());
                path.addChild(v);
                return v;
            }

            let points = $path.attr("d").split(/\s+/);
            let startVert, lastVert, p, v;
            let vertices = [];

            function isXY() {
                return (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?,[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(points[0]));
            }

            function isN() {
                return (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(points[0]));
            }

            function getXY() {
                let xy = points.shift().split(",");
                return new Three.Vector3(parseFloat(xy[0]), parseFloat(xy[1]), 0);
            }

            function getN() {
                return parseFloat(points.shift());
            }
            
            while (points.length > 0) {
                cmd = points.shift();
                j = 0;
                switch (cmd) {

                case "L": case "M":
                case "l": case "m":
                    p = getXY();
                    if (/[A-Z]/.test(cmd))
                        pos.copy(p);
                    else {
                        pos.x += p.x; pos.y += p.y;
                    }
                    v = addVert(pos);
                    if (!startVert) startVert = v;
                    if (lastVert && (cmd === "L" || cmd === "l"))
                        path.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                    while (isXY()) {
                        p = getXY();
                        if (/[A-Z]/.test(cmd))
                            pos.copy(p);
                        else {
                            pos.x += p.x; pos.y += p.y;
                        }
                        v = addVert(pos);
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "H": case "V":
                case "h": case "v":
                    p = getN();
                    switch (cmd) {
                    case "H": pos.x = p; break;
                    case "V": pos.y = p; break;
                    case "h": pos.x += p; break;
                    case "v": pos.y += p; break;
                    }
                    v = addVert(pos);
                    lastVert = v;
                    if (!startVert) startVert = v;
                    while (isN()) {
                        p = getN();
                        switch (cmd) {
                        case "H": pos.x = p; break;
                        case "V": pos.y = p; break;
                        case "h": pos.x += p; break;
                        case "v": pos.y += p; break;
                        }
                        v = addVert(pos);
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "Z": case "z": // close path
                    if (lastVert && startVert) {
                        path.addEdge(new Edge(lastVert, startVert));
                        lastVert = startVert;
                        pos.copy(lastVert.position);
                    }
                    break;

                case "C": case "c":
                case "S": case "s":
                case "Q": case "q":
                    // Curves, treat as edge to end point
                    while (isXY()) {
                        if (/C/i.test(cmd))
                            getXY(); // C has 2 control points
                        if (/[CSQ]/i.test(cmd))
                            getXY(); // Cubic has 2 control points
                        // T has no control points
                        p = getXY();
                        if (/[A-Z]/.test(cmd))
                            pos.copy(p);
                        else
                            pos.x += p.x, pos.y += p.y;
                        v = addVert(pos);
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "A": case "a": // arcs - ignore
                    getXY(); // rx, ry
                    getN(); // angle
                    getN(); // large-arc-flag
                    getN(); // sweep-flag
                    lastVert = addVert(pos);
                    p = getXY();
                    if (/[A-Z]/.test(cmd))
                        pos.copy(p);
                    else
                        pos.x += p.x, pos.y += p.y;
                    break;
                }
            }
            return path;
        }

        loadImage($image, attrs) {
            // Always get images from data/
            let url = "data/" + ($image.attr("href")
                                 || $image.attr("xlink:href"))
                .replace(/.*\//, "");

            console.debug("Image URL:", url);

            let x = parseFloat($image.attr("x"));
            let y = parseFloat($image.attr("y"));
            let h = parseFloat($image.attr("height"));
            let w = parseFloat($image.attr("width"));
            return new ImagePlane(
                url,
                new Three.Vector3(x, y, attrs.depth),
                new Three.Vector3(x + w, y + h, -attrs.depth));
        }
        
        // @Override XML
        load(source, data) {
            let $xml = this.parse(source, data);
            let height = parseFloat($xml.attr("height"));
            let loader = this;
            // Process paths
            let visuals = [], metadata = {};
            $xml.children().each(function() {
                let object;

                let $desc = $(this).children("desc");
                let attrs = { depth: 0 };
                if ($desc.length > 0)
                    try {
                        attrs = JSON.parse($desc.text());
                    } catch (e) {
                        console.error("Bad JSON " + $desc.text());
                    }
                
                switch (this.tagName) {
                case "metadata":
                    // This loader abuses metadata description for carrying
                    // attributes in a block of JSON
                    $(this).find("dc\\:description").each(function() {
                        let desc = $(this).text();
                        try {
                            metadata = JSON.parse(desc);
                        } catch (e) {
                            console.error("Bad metadata description " + e);
                        }
                    });
                    return;
                    
                case"image":
                    object = loader.loadImage($(this), attrs);
                    break;
                    
                case "path":
                    object = loader.loadPath($(this), attrs);
                    break;

                default:
                    console.debug("Ignore " + this.tagName);
                    return;
                }

                applySVGTransforms($(this).attr("transform"), object);

                visuals.push(object);
            });

            // Assume the SVG is plotted at metadata.resolution pixels per metre,
            // and the metadata.reference_point is at lat/long:

            let mats = [
                new Three.Matrix4(),
                new Three.Matrix4(),
                new Three.Matrix4()
            ];

            mats[0].makeTranslation(
                -metadata.reference_point.x, -height - metadata.reference_point.y, 0);

            // Scale and flip y
            mats[1].makeScale(
                1 / metadata.units_per_metre, -1 / metadata.units_per_metre, 1);

            let utm = UTM.fromLatLong(
                metadata.reference_point.lat, metadata.reference_point.lon,
                metadata.zone);

            if (!metadata.zone) metadata.zone = utm.zone;
            if (!metadata.band) metadata.band = utm.band;
            
            mats[2].makeTranslation(utm.easting, utm.northing, 0);

            for (let o of visuals) {
                for (let m of mats)
                    o.applyTransform(m);
            }
            return { metadata: metadata, visuals: visuals };
        }

        save(visual) {
            let surv = visual;
            let doc = this.mTemplate.cloneNode(true);
            if (visual.metadata)
                $(doc).find("dc\\:description").text(JSON.stringify(visual.metadata));
            let $dom = $(doc).children("svg").first();
            let bb = visual.boundingBox;
            let ll = surv.user2saveUnits(bb.min);
            let ur = surv.user2saveUnits(bb.max);
            $dom.attr("width", ur.x - ll.x);
            let height = ur.y - ll.y;
            $dom.attr("height", height);
            $dom.attr("viewBox", ll.x + " " + ll.y + " "
                      + ur.x + " " + ur.y);
            $dom.attr("sodipodi:docname", visual.name);
            
            function makeSVG(visual, $dom, doc) {
                let dom;
                if (visual instanceof Container) {
                    if (visual instanceof Network) {
                        // Make a path
                        dom = doc.createElement("svg:path");
                        if (visual.name)
                            dom.setAttribute("name", visual.name);
                        dom.setAttribute("id", visual.name);
                        let d = "M";
                        for (let o of visual.children) {
                            if (o instanceof Vertex) {
                                let v = surv.user2saveUnits(o.position);
                                d += " " + v.x + " " + (height - v.y);
                            } else
                                console.debug("Unsupported Network Visual " + o);
                        }
                        dom.setAttribute("d", d);
                        dom.setAttribute("style", "display:inline;fill:none;stroke:#FF00FF:none;stroke-width:1px;stroke-opacity:1");
                        $dom.append(dom);
                    } else {
                        // Flatten out
                        for (let o of visual.children) {
                            let kid = makeSVG(o, $dom, doc);
                            if (kid)
                                $dom.append(kid);
                        }
                        return;
                    }
                } else {
                    console.debug("Unsupported Visual " + visual);
                    return;
                }
            }
            makeSVG(visual, $dom, doc);
            return '<?xml version="1.0" encoding="UTF-8"?>'
            +  new XMLSerializer().serializeToString(doc);
        }
    }
    return SVG;
});
