define("js/FileFormats/svg", ["js/FileFormats/XML", "three", "js/Point", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/ImagePlane", "js/UTM", "jquery-ui"], function(XML, Three, Point, Vertex, Edge, Container, Network, ImagePlane, UTM) {

    /**
     * Specialised loader/saver for an SVG used to carry survey information.
     * There are a number of standards that must be observed for a survey
     * SVG. First, there must be document metadata containing a "dc:description"
     * that carries attribute key:value pairs as follows:
     *   lat:, lon: // real world location of the reference point,
     *   x:, y:     // location of the reference point in SVG units
     *              // in decimal degrees
     *   units_per_metre: // resolution in SVG units per metre
     * The key:value block must be the first thing in the description. The rest
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
     * relative to the application. TODO: put URL in desc?
     *
     * SVG entities may be annotated with key=value pairs in their
     * descriptions.
     * type: <entity type>
     * type: point, when applied to a circle, defines a point depth
     * measurement.
     */

    const IS_NUMBER = /^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/;
    
    // Styling for paths in output SVG
    const PATH_STYLE =
          "fill:none;stroke:#FF00FF;stroke-width:1px;stroke-opacity:1";
    const POINT_STYLE =
          "fill:#FFFF00;fill-opacity:1;stroke:none";
    
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const METADATA = [ "lat", "lon", "x", "y", "units_per_metre" ];

    let counter = 0;

    // Loader
    
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
                    mat.multiply(step);
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

    /**
     * Parse a string of comma-separated key:value pairs from a string
     */
    function parseProps(text) {
        let re = /(^|\s*,)\s*(\w+)\s*:\s*((["']).*?\4|[^,\s]*)/g;
        let m;
        let props = {};
        while (m = re.exec(text)) {
            let k = m[2];
            let v = m[3];
            if (IS_NUMBER.test(v))
                props[k] = parseFloat(v);
            else // quoted numbers are treated as strings
                props[k] = v.replace(/^(["'])(.*)\1/, "$2");
        }
        return props;
    }

    function getAttrN($el, attrn, def) {
        return parseFloat($el.attr(attrn));
    }

    function addVertex(el, name, vx) {
        let v = new Vertex(name, vx.clone());
        el.addChild(v);
        return v;
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

        _load_rect($rect, name, props) {
            let x = getAttrN($rect, "x");
            let y = getAttrN($rect, "y");
            let w = getAttrN($rect, "width");
            let h = getAttrN($rect, "height");
            let path = new Network(name);
            let v0 = addVertex(
                path, name + "_xy", new Three.Vector3(x, y, 0));
            let v1 = addVertex(
                path, name + "_Xy", new Three.Vector3(x + w, y, 0));
            let v2 = addVertex(
                path, name + "_XY", new Three.Vector3(x + w, y + h, 0));
            let v3 = addVertex(
                path, name + "_xY", new Three.Vector3(x, y + h, 0));
            path.addEdge(new Edge(v0, v1));
            path.addEdge(new Edge(v1, v2));
            path.addEdge(new Edge(v2, v3));
            path.addEdge(new Edge(v3, v0));
            return path;
        }

        _load_polyline($poly, name, props, closed) {
            let path = new Network(name);
            let pts = $poly.getAttribute("points").split(/[,\s]+/);
            let sv;
            for (let i = 0; i < pts.length; i += 2) {
                let v = addVertex(
                    path, name + "_" + (i / 2),
                    new Three.Vector3(pts[i], pts[i + 1], 0));
                if (!sv) sv = v;
                if (vp)
                    path.addEdge(new Edge(vp, v));
                vp = v;
            }
            if (closed && vp && sv && vp !== sv)
                path.addEdge(vp, sv);
            return path;
        }
        
        _load_polygon($poly, name, props) {
            return this.load_polyline($poly, name, props, true);
        }

        _load_line($poly, name, props) {
            let path = new Network(name);
            let v0 = addVertex(getAttrN($rect, "x1"),
                               getAttrN($rect, "y1"), 0);
            let v1 = addVertex(getAttrN($rect, "x2"),
                               getAttrN($rect, "y2"), 0);
            path.addEdge(v0, v1);
            return path;
        }
        
        _load_path($path, name, props) {
            console.debug("Loading path", name);
            let path = new Network(name);
            let vertindex = {};
            let pos = new Three.Vector3(0, 0, 0);

            let cmd, j;
            function addPV(vx) {
                let i = vx.x + "," + vx.y + "," + vx.z;
                let known = vertindex[i];
                if (known)
                    return known;
                known = addVertex(path, name + ":" + cmd + j++, vx);
                vertindex[i] = known;
                return known;
            }

            let points = $path.attr("d").split(/[,\s]+/);
            let startVert, lastVert, p, v;
            let vertices = [];

            function getN() {
                return parseFloat(points.shift());
            }
            
            function getXY() {
                let x = getN();
                let y = getN();
                return new Three.Vector3(x, y, 0);
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
                    v = addPV(pos);
                    if (!startVert) startVert = v;
                    if (lastVert && (cmd === "L" || cmd === "l"))
                        path.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                    while (IS_NUMBER.test(points[0])) {
                        p = getXY();
                        if (/[A-Z]/.test(cmd))
                            pos.copy(p);
                        else {
                            pos.x += p.x; pos.y += p.y;
                        }
                        v = addPV(pos);
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
                    v = addPV(pos);
                    if (lastVert)
                        path.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                    if (!startVert) startVert = v;
                    while (IS_NUMBER.test(points[0])) {
                        p = getN();
                        switch (cmd) {
                        case "H": pos.x = p; break;
                        case "V": pos.y = p; break;
                        case "h": pos.x += p; break;
                        case "v": pos.y += p; break;
                        }
                        v = addPV(pos);
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
                    while (IS_NUMBER.test(points[0])) {
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
                        v = addPV(pos);
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "A": case "a": // arcs - ignore
                    getXY(); // rx, ry
                    getN(); // angle
                    getN(); // large-arc-flag
                    getN(); // sweep-flag
                    lastVert = addPV(pos);
                    p = getXY();
                    if (/[A-Z]/.test(cmd))
                        pos.copy(p);
                    else
                        pos.x += p.x, pos.y += p.y;
                    break;
                }
            }

            if (path.children.length === 0) {
                console.debug("Empty path", path.name, "ignored"); 
                return undefined;
            }
            return path;
        }

        _load_image($image, name, props) {
            // Always get images from data/
            let url = "data/" + ($image.attr("href")
                                 || $image.attr("xlink:href"))
                .replace(/.*\//, "");

            console.debug("Loading image", url);
            let x = getAttrN($image, "x");
            let y = getAttrN($image, "y");
            let h = getAttrN($image, "height");
            let w = getAttrN($image, "width");
            let plane = new ImagePlane(
                name,
                url,
                new Three.Vector3(x, y, 0),
                new Three.Vector3(x + w, y + h, 0));

            return plane;
        }

        _load_circle($xml, name, props) {
            let pt;
            if (props.type === "point") {
                console.debug("Loading point", name);
                pt = new Point(
                    name, new Three.Vector3(
                        getAttrN($xml, "cx"),
                        getAttrN($xml, "cy"), 0));
            }
            else
                console.debug("Ignore non-point circle");
            
            return pt;
        }
        
        _load_g($xml, name, props) {
            let loader = this;               
            let group = new Container(name);
            $xml.children().each(function() {
                let cname = $(this).attr("id") || counter++;
                let $title = $(this).children("title");
                if ($title.length > 0)
                    cname = $title.text();
                let props = {};
                let $desc = $(this).children("desc");
                if ($desc.length > 0)
                    props = parseProps($desc.text());

                let fn = loader["_load_" + this.tagName];

                let obj;
                if (fn)
                    obj = fn.call(loader, $(this), cname, props);
                else
                    console.debug("Ignore", this.tagName);

                if (obj) {
                    for (let k in props)
                        obj.prop(k, props[k]);
                    applySVGTransforms($(this).attr("transform"), obj);
                    group.addChild(obj);
                }
            });
            return group;
        }

        // @Override FileFormat
        load(source, data) {
            let $xml = this.parse(source, data);
            
            // Default metadata
            let metadata = {
                lat: 51.477905, lon: 0,// Greenwich
                x: 0, y: 0, // bottom left corner
                units_per_metre: 10 // 10px per metre
            };
            
            // This loader abuses SVG metadata for carrying
            // attributes in a key:value block inside the dc:description.
            // Find it and extract the metadata
            $xml.children("metadata").find("dc\\:description").each(function() {
                $.extend(metadata, parseProps($(this).text()));
            });

            // Seed the utm default zone if it's not already been done
            UTM.fromLatLong(metadata.lat, metadata.lon);

            // Populate dialog with values from metadata
            let $dlg = $("#svg_dialog");
            for (let f of METADATA)
                if (typeof metadata[f] !== "undefined")
                    $('#svg_' + f).val(metadata[f]);

            return new Promise((resolve, reject) => {
                $dlg.dialog("option", "title", "SVG import " + source);
                $dlg.dialog("option", "buttons", [
                    {
                        text: "Import",
                        click: function() {
                            $(this).dialog("close");
                            for (let f of METADATA) {
                                let $i = $('#svg_' + f);
                                if ($i.attr("type") === "number")
                                    metadata[f] = parseFloat($i.val());
                                else
                                    metadata[f] = $i.val();
                            }
                            resolve();
                        },
                    }]);
                $dlg.dialog("option", "close", reject);
                $dlg.dialog("open");
            })
            .then(() => {
                let g = this._load_g($xml, "root", {});
                let mats = [];

                // SVG coords have 0,0, at the top left, so
                // flip the Y axis so that the bottom left becomes 0, 0
                let height = getAttrN($xml, "height");
                mats.push(new Three.Matrix4().makeTranslation(0, -height, 1));
                mats.push(new Three.Matrix4().makeScale(1, -1, 1));

                // Translate reference point to 0, 0
                if (metadata.x !== 0 || metadata.y !== 0)
                    mats.push(new Three.Matrix4().makeTranslation(
                        -metadata.x, -metadata.y, 0));

                // Scale to metres
                let scale = 1 / metadata.units_per_metre;
                if (scale !== 1)
                    mats.push(new Three.Matrix4().makeScale(scale, scale, 1));

                // Translate reference point to reference lat,lon
                let utm = UTM.fromLatLong(metadata.lat, metadata.lon);
                mats.push(new Three.Matrix4()
                          .makeTranslation(utm.easting, utm.northing, 0));

                for (let m of mats)
                    g.applyTransform(m);
                return g;
            });
        }

        // Saver

        // @Override FileFormat
        save(visual) {

            let mump = 10; // SVG px  per metre
            
            // Get position and width/height of the bounding box in
            // UTM coords
            let bb = visual.boundingBox;
            let minx = bb.min.x;
            let miny = bb.min.y;
            let width = (bb.max.x - minx) * mump;
            let height = (bb.max.y - miny) * mump;

            // Lat/long of the origin
            let llo = new UTM(bb.min.x, bb.min.y).toLatLong();
            let metadata = {
                lat: llo.latitude,
                lon: llo.longitude,
                x: 0, y: 0, // bottom left corner
                units_per_metre: mump // 10px per metre
            };

            // Convert a point or a box in UTM coords to SVG coords
            function utm2svg(p) {
                if (p instanceof Three.Box3)
                    return new Three.Box3(utm2svg(p.min), utm2svg(p.max));
                return new Three.Vector3(
                    (p.x - minx) * mump,
                    height - (p.y - miny) * mump,
                    0);
            }
            
            let doc = this.mTemplate.cloneNode(true);
            let $svg = $(doc).children("svg").first();

            let metas = [];
            for (let m in metadata)
                metas.push(m + ":" + metadata[m]);                
            $svg.find("dc\\:description").text(metas.join(","));

            $svg.attr("width", width);
            $svg.attr("height", height);
            $svg.attr("viewBox", "0 0 " + width + " " + height);
            $svg.attr("sodipodi:docname", visual.name);

            // Make an XML DOM element of the given tag for the given Visual
            function makeEl(tag, visual) {
                let el = document.createElementNS(SVG_NS, tag);
                if (visual.name) {
                    let tit = document.createElementNS(SVG_NS, "title");
                    tit.appendChild(document.createTextNode(visual.name));
                    el.appendChild(tit);
                }
                let vs = [];
                for (let k of visual.props) {
                    let v = visual.prop(k);
                    if (typeof v === "number")
                        vs.push(k + ':' + v);
                    else if (typeof v !== "undefined")
                        vs.push(k + ':"' + v + '"');
                }
                if (vs.length > 0) {
                    let desc = document.createElementNS(SVG_NS, "desc");
                    desc.appendChild(document.createTextNode(vs.join(",")));
                    el.appendChild(desc);
                }
                return el;
            }

            // Make the SVG for the given Visual, adding the XML DOM to the
            // given container
            function makeSVG(visual, container) {
                switch (visual.constructor.name) {
                    
                case "Network": {
                    // Serialise the network as individual edges in a
                    // path
                    let path = makeEl("path", visual);
                    let lines = [];
                    let last;
                    for (let e of visual.edges) {
                        if (e.p1 === last) {
                            let v2 = utm2svg(e.p2.position);
                            lines.push(v2.x + " " + v2.y);
                            last = v2;
                        } else if (e.p2 === last) {
                            let v1 = utm2svg(e.p1.position);
                            lines.push(v1.x + " " + v1.y);
                            last = v1;
                        } else {
                            let v1 = utm2svg(e.p1.position);
                            let v2 = utm2svg(e.p2.position);
                            lines.push("M " + v1.x + " " + v1.y
                                       + " " + v2.x + " " + v2.y);
                            last = e.p2;
                        }
                    }
                    path.setAttribute("d", lines.join(" "));
                    path.setAttribute("style", PATH_STYLE);
                    container.appendChild(path);
                    break;
                }
                    
                case "Container": {
                    let group = makeEl("g", visual);
                    for (let o of visual.children)
                        makeSVG(o, group);
                    container.appendChild(group);
                    break;
                }
                    
                case "Point": {
                    let v = utm2svg(visual.position);
                    let circle = makeEl("circle", visual);
                    circle.setAttribute("style", POINT_STYLE);
                    circle.setAttribute("cx", v.x);
                    circle.setAttribute("cy", v.y);
                    circle.setAttribute("r", 2);
                    container.appendChild(circle);
                    break;
                }
                    
                case "ImagePlane": {
                    console.debug("Reminder: support ImagePlane");
                    break;
                }
                    
                default:
                    throw new Error("Unsupported Visual " + visual);
                }
            }
            for (let o of visual.children)
                makeSVG(o, $svg[0]);

            return '<?xml version="1.0" encoding="UTF-8"?>'
            +  new XMLSerializer().serializeToString(doc);
        }
    }
    return SVG;
});
