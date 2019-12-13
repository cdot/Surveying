/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/FileFormats/svg", ["js/FileFormats/XML", "three", "js/Point", "js/Container", "js/Mesh", "js/Contour", "js/Path", "js/Units", "jquery-ui"], function(XML, Three, Point, Container, Mesh, Contour, Path, Units) {

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
     *
     * SVG entities may be annotated with key=value pairs in their
     * descriptions.
     * type: <entity type>
     * type: point, when applied to a circle, defines a sounding
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
    
    function parseSVGTransform(tx) {

        let parts = tx.replace(/\s*\)\s*$/, "").split(/[(, ]+/);
        let fn = parts.shift();
        let vs = [];
        for (let p of parts)
            vs.push(parseFloat(p));
        
        let matrix = new Three.Matrix4();
        switch(fn) {
        case "matrix":
            //[a c e]
            //[b d f]
            matrix.set(vs[0], vs[2], 0, vs[4],
                       vs[1], vs[3], 0, vs[5],
                       0, 0, 1, 0,
                       0, 0, 0, 1);
            break;
                    
        case "rotate": {
            if (vs.length === 3)
                matrix.makeTranslation(-vs[1], -vs[2], 0);

            let step = new Three.Matrix4();
            step.makeRotationZ(-vs[0] * Math.PI / 180);
            matrix.multiply(step);

            if (vs.length === 3) {
                step.makeTranslation(vs[1], vs[2], 0);
                matrix.multiply(step);
            }
            break;
        }    
            
        case "translate":
            matrix.makeTranslation(vs[0], vs[1], 0);
            break;

        case "scale":
            if (vs.length === 1)
                vs[1] = vs[0];
            matrix.makeScale(vs[0], vs[1], 1);
            break;

        default:
            throw new Error("transform not supported: " + tx);
        }

        return matrix;
    }
    
    function parseSVGTransforms(transforms) {
        let mat = new Three.Matrix4();
        let txs = transforms.split(/(\w+\s*\(.*?\))/);
        for (let tx of txs) {
            if (/^\w+\s*\(.*?\)$/.test(tx))
                mat.multiply(parseSVGTransform(tx));
            else if (!/^[\s,]*$/.test(tx))
                throw new Error("Bad transform " + tx + " in " + transforms);
        }
        return mat;
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

    /**
     * Get the value of a numeric attribute
     * @param $el XML element
     * @param attrn attribute name
     */
    function getAttrN($el, attrn) {
        return parseFloat($el.attr(attrn));
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
            let obj = props.type === "contour" ?
                new Contour(name) : new Path(name);
            let z = props.depth ? parseFloat(props.depth) : 0;
            obj.addVertex({ x: x,     y: y,     z: z });
            obj.addVertex({ x: x + w, y: y,     z: z });
            obj.addVertex({ x: x + w, y: y + h, z: z });
            obj.addVertex({ x: x,     y: y + h, z: z });
            if (obj instanceof Contour)
                obj.setZ(z);
            obj.close();
            return obj;
        }

        _load_polyline($poly, name, props) {
            let obj = props.type === "contour" ?
                new Contour(name) : new Path(name);
            let z = props.depth ? parseFloat(props.depth) : 0;
            let pts = $poly.getAttribute("points").split(/[,\s]+/);
            for (let i = 0; i < pts.length; i += 2)
                obj.addVertex({ x: pts[i], y: pts[i + 1], z: z });
            if (obj instanceof Contour)
                obj.setZ(z);
            return obj;
        }
        
        _load_polygon($poly, name, props) {
            let p = this.load_polyline($poly, name, props);
            p.close();
            return p;
        }

        _load_line($poly, name, props) {
            let obj = new Path(name);
            let z = props.depth ? parseFloat(props.depth) : 0;
            obj.addVertex({ x: getAttrN($rect, "x1"),
                            y: getAttrN($rect, "y1"),
                            z: z });
            obj.addVertex({ x: getAttrN($rect, "x2"),
                            y: getAttrN($rect, "y2"),
                            z: z });
            return obj;
        }

        // Treat paths as sequences of connected vertices
        _load_path($path, name, props) {
            let vertices = [];
            let pos = { x: 0, y: 0 };
            let cmd;
            let closed = false;

            function getN() { return parseFloat(points.shift()); }
            
            function getXY() {
                let x = getN();
                let y = getN();
                return { x : x, y: y };
            }

            function getNextPos() {
                let p = getXY();
                if (/[A-Z]/.test(cmd))
                    pos.x = p.x, pos.y = p.y;
                else
                    pos.x += p.x, pos.y += p.y;
                vertices.push({ x: pos.x, y: pos.y });
            }

            let points = $path.attr("d").split(/[,\s]+/);
            while (points.length > 0) {
                cmd = points.shift();
                switch (cmd) {

                case "M": case "m":
                case "L": case "l":
                    while (IS_NUMBER.test(points[0]))
                        getNextPos();
                    break;
                    
                case "H": case "V":
                case "h": case "v": {
                    let p = getN();
                    switch (cmd) {
                    case "H": pos.x = p; break;
                    case "V": pos.y = p; break;
                    case "h": pos.x += p; break;
                    case "v": pos.y += p; break;
                    }
                    vertices.push({ x: pos.x, y: pos.y });
                    while (IS_NUMBER.test(points[0])) {
                        p = getN();
                        switch (cmd) {
                        case "H": pos.x = p; break;
                        case "V": pos.y = p; break;
                        case "h": pos.x += p; break;
                        case "v": pos.y += p; break;
                        }
                        vertices.push({ x: pos.x, y: pos.y });
                    }
                    break;
                }
                    
                case "Z": case "z": // close path
                    closed = true;
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
                        getNextPos();
                    }
                    break;
                    
                case "A": case "a": // arcs - ignore
                    console.debug("Ignoring", cmd);
                    getXY(); // rx, ry
                    getN(); // angle
                    getN(); // large-arc-flag
                    getN(); // sweep-flag
                    getNextPos();
                    break;
                }
            }

            if (vertices.length === 0) {
                console.debug("\tempty path ignored"); 
                return undefined;
            }

            let obj = (props.type === "contour") ?
                new Contour(name) : new Path(name);
            let z = props.depth ? parseFloat(props.depth) : 0;
            for (let v of vertices)
                obj.addVertex({ x: v.x, y: v.y, z: z });
            if (obj instanceof Contour)
                obj.setZ(z);

            if (closed)
                obj.close();
            
            return obj;
        }

        // Handle circle or ellipse
        _spot($xml, name, props, rx, ry) {
            let cx = getAttrN($xml, "cx");
            let cy = getAttrN($xml, "cy");
            let z = props.depth ? parseFloat(props.depth) : 0;
            if (props.type === "point")
                return new Point({ x: cx, y: cy, z: z }, name);

            // Not tagged as "point", treat as a contour
            let c = new Contour(name);
            c.setZ(z);
            for (let i = 0; i < 10; i++) {
                let a = i * Math.PI / 5;
                c.addVertex({ x: cx + rx * Math.cos(a),
                              y: cy + ry * Math.sin(a) });
            }
            c.close();
            return c;
        }
        
        _load_circle($xml, name, props) {
            let r = getAttrN($xml, "r")
            return this._spot($xml, name, props, r, r);
        }
        
        _load_ellipse($xml, name, props) {
            let rx = getAttrN($xml, "rx");
            let ry = getAttrN($xml, "ry");
            return this._spot($xml, name, props, rx, ry);
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

                if (props.type === "ignore")
                    return;
                
                let fn = loader["_load_" + this.tagName];

                let obj;
                if (fn) {
                    console.debug("Load", props.type, this.tagName, cname);
                    obj = fn.call(loader, $(this), cname, props);
                } else
                    console.debug("Ignore", this.tagName);

                if (obj) {
                    let txs = $(this).attr("transform");
                    if (txs) {
                        let m = parseSVGTransforms(txs);
                        obj.applyTransform(m);
                    }
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
                let width = getAttrN($xml, "width");
                let height = getAttrN($xml, "height");
               
                 Units.mapFromEX(
                    {
                        min: { x:     0, y:      0 },
                        max: { x: width, y: height }
                    },
                    metadata.units_per_metre,
                    true);

                // Set up conversions
                let tx = Units.convert(Units.LONLAT, metadata, Units.IN);
                console.debug("origin offset ", tx);

                let g = this._load_g($xml, "root", {});
                let mats = [];

                // We loaded the SVG applying all transformations from the
                // document as we went along. Now need to transform those
                // coordinates to the Units.IN system.
                
                // SVG coords have 0,0, at the top left, so
                // flip the Y axis so that the bottom left becomes 0, 0
                mats.push(new Three.Matrix4().makeTranslation(0, -height, 0));
                mats.push(new Three.Matrix4().makeScale(1, -1, 1));

                // Translate reference point to 0, 0
                if (metadata.x !== 0 || metadata.y !== 0)
                    mats.push(new Three.Matrix4().makeTranslation(
                        -metadata.x, -metadata.y, 0));

                // Scale to internal units
                let scale = Units.convert(
                    Units.EX, { x: 1, y: 1, z: Units.UPM[Units.EX] }, Units.IN);

                mats.push(new Three.Matrix4().makeScale(
                    scale.x,
                    -scale.y,
                    -scale.z));

                // Translate reference point to reference lat,lon
                mats.push(new Three.Matrix4().makeTranslation(tx.x, tx.y, 0));

                for (let m of mats)
                    g.applyTransform(m);
                return g;
            });
        }

        // Saver

        // @Override FileFormat
        save(visual) {

            // Set up SVG pixels-per-metre
            Units.UPM[Units.EX] = 10;
            
            // Get position and width/height of the bounding box
            // to set up the transform to SVG units
            let bb = visual.boundingBox;
            Units.BB[Units.IN] = bb;
                
            // Lat/long of the origin
            let llo = Units.convert(Units.IN, bb.min, Units.LONLAT);
            let metadata = {
                lat: llo.lat,
                lon: llo.lon,
                x: 0, y: 0, // bottom left corner
                units_per_metre: 10 // px per metre
            };

            // Make a copy of the SVG template document
            let doc = this.mTemplate.cloneNode(true);

            // Build metadata description
            let $svg = $(doc).children("svg").first();
            let metas = [];
            for (let m in metadata)
                metas.push(m + ":" + metadata[m]);                
            $svg.find("dc\\:description").text(metas.join(","));

            let width = Units.BBwidth(Units.EX);
            $svg.attr("width", width);
            let height = Units.BBheight(Units.EX);
            $svg.attr("height", height);
            $svg.attr("viewBox", "0 0 " + width + " " + height);
            $svg.attr("sodipodi:docname", visual.name);

            // Make an XML DOM element of the given tag for the given Visual
            function makeEl(tag, visual, props) {
                let el = document.createElementNS(SVG_NS, tag);
                if (visual.name) {
                    let tit = document.createElementNS(SVG_NS, "title");
                    tit.appendChild(document.createTextNode(visual.name));
                    el.appendChild(tit);
                }
                let vs = [];
                for (let k in props) {
                    let v = props[k];
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
                let props = {};
                switch (visual.constructor.name) {
                    
                case "Contour":
                    props.type = "contour";
                    props.depth = -visual.z / Units.UPM[Units.IN];
                    // Fall-through deliberate
                    
                case "Path":
                    let path = makeEl("path", visual, props);
                    let lines = [ "M" ];
                    for (let e of visual.children) {
                        let v = Units.convert(Units.IN, e.position, Units.EX);
                        lines.push(v.x, v.y);
                    }
                    if (visual.isClosed)
                        lines.push("z");
                    path.setAttribute("d", lines.join(" "));
                    path.setAttribute("style", PATH_STYLE);
                    container.appendChild(path);
                    break;
                    
                case "Mesh": {
                    // Serialise the network as individual edges in a
                    // path
                    let path = makeEl("path", visual, props);
                    let lines = [];
                    let last;
                    for (let e of visual.edges) {
                        if (e.p1 === last) {
                            let v2 = Units.convert(Units.IN, e.p2.position, Units.EX);
                            lines.push(v2.x + " " + v2.y);
                            last = v2;
                        } else if (e.p2 === last) {
                            let v1 = Units.convert(Units.IN, e.p1.position, Units.EX);
                            lines.push(v1.x + " " + v1.y);
                            last = v1;
                        } else {
                            let v1 = Units.convert(Units.IN, e.p1.position, Units.EX);
                            let v2 = Units.convert(Units.IN, e.p2.position, Units.EX);
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
                    let group = makeEl("g", visual, props);
                    for (let o of visual.children)
                        makeSVG(o, group);
                    container.appendChild(group);
                    break;
                }
                    
                case "Point": {
                    let v = Units.convert(Units.IN, visual.position, Units.EX);
                    let circle = makeEl("circle", visual, props);
                    circle.setAttribute("style", POINT_STYLE);
                    circle.setAttribute("cx", v.x);
                    circle.setAttribute("cy", v.y);
                    // Radius 0.25m = 25cm
                    circle.setAttribute("r", Units.UPM[Units.EX] / 4);
                    container.appendChild(circle);
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
