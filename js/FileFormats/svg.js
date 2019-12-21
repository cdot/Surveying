/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */

define("js/FileFormats/svg", ["js/FileFormats/XML", "three", "js/POI", "js/Container", "js/Path", "js/Contour", "js/Sounding", "js/Units", "jquery-ui"], function(XML, Three, POI, Container, Path, Contour, Sounding, Units) {

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

    const IS_NUMBER = /^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/u;

    // Styling for paths in output SVG
    const PATH_STYLE
    = "fill:none;stroke:#FF00FF;stroke-width:1px;stroke-opacity:1";
    const POINT_STYLE
    = "fill:#FFFF00;fill-opacity:1;stroke:none";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const METADATA = ["lat", "lon", "x", "y", "units_per_metre"];

    let counter = 0;

    // Loader

    function parseSVGTransform(tx) {

        let parts = tx.replace(/\s*\)\s*$/u, "").split(/[(, ]+/u);
        let fn = parts.shift();
        let vs = [];
        for (let p of parts)
            vs.push(parseFloat(p));

        let matrix = new Three.Matrix4();
        switch (fn) {
        case "matrix":
            // [a c e]
            // [b d f]
            matrix.set(
                vs[0], vs[2], 0, vs[4],
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
            throw new Error(`transform not supported: ${tx}`);
        }

        return matrix;
    }

    function parseSVGTransforms(transforms) {
        let mat = new Three.Matrix4();
        let txs = transforms.split(/(\w+\s*\(.*?\))/u);
        for (let tx of txs) {
            if (/^\w+\s*\(.*?\)$/u.test(tx))
                mat.multiply(parseSVGTransform(tx));
            else if (!/^[\s,]*$/u.test(tx))
                throw new Error(`"Bad transform ${tx} in ${transforms}`);
        }
        return mat;
    }

    /**
     * Parse a string of comma-separated key:value pairs from a string
     */
    function parseProps(text) {
        let re = /(^|\s*,)\s*(\w+)\s*:\s*((["']).*?\4|[^,\s]*)/gu;
        let m;
        let props = {};
        while ((m = re.exec(text))) {
            let k = m[2];
            let v = m[3];
            if (IS_NUMBER.test(v))
                props[k] = parseFloat(v);
            else // quoted numbers are treated as strings
                props[k] = v.replace(/^(["'])(.*)\1/u, "$2");
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

    /**
     * Simple parser for "d" attributes
     */
    class DParser {

        N(d) {
            while (d && --d > 1)
                if (!IS_NUMBER.test(this.tokens.shift()))
                    throw new Error("Bad d");
            return parseFloat(this.tokens.shift());
        }
        
        V(cmd) {
            let px = this.N();
            let py = this.N();
            if (/[A-Z]/u.test(cmd)) {
                this.pos.x = px;
                this.pos.y = py;
            }
            else {
                this.pos.x += px;
                this.pos.y += py;
            }
            this.vertices.push({ x: this.pos.x, y: this.pos.y });
        }

        HhVv(cmd) {
            let p = this.N();
            if (cmd === "H") this.pos.x = p;
            else if (cmd === "V") this.pos.y = p;
            else if (cmd === "h") this.pos.x += p;
            else this.pos.y += p; // "v"
            this.vertices.push({ x: this.pos.x, y: this.pos.y });
        }
        
        cmd() {
            let cmd = this.tokens.shift();

            if (/^[ML]$/iu.test(cmd))
                while (IS_NUMBER.test(this.tokens[0]))
                    this.V(cmd);
            else if (/^[HV]$/iu.test(cmd)) {
                this.HhVv(cmd);
                while (IS_NUMBER.test(this.tokens[0]))
                    this.HhVv(cmd);
            }
            else if (/^Z$/ui.test(cmd))
                this.closed = true;
            else if (/^[CSQT]$/ui.test(cmd)) {
                // Curves, treat as edge to end point
                while (IS_NUMBER.test(this.tokens[0])) {
                    if (/C/ui.test(cmd))
                        this.N(2); // C has 2 control points
                    if (/[CSQ]/iu.test(cmd))
                        this.N(2); // Cubic has 2 control points
                    // T has no control points
                    this.V(cmd);
                }
            }
            else if (/^A$/ui.test(cmd)) {
                // console.debug("Ignoring", cmd);
                this.N(6); // rx, ry, angle, large-arc-flag, sweep-flag
                this.V(cmd);
            }
            else
                throw new Error(`Bad d at ${cmd}`);
        }

        constructor(d) {
            this.tokens = d.split(/[,\s]+/u);
            this.vertices = [];
            this.pos = { x: 0, y: 0 };
            this.closed = false;

            while (this.tokens.length > 0)
                this.cmd();
        }
    }
    
    class SVG extends XML {

        constructor() {
            super("svg");
            let loader = this;
            $.ajax({
                url: "templates/svg.svg",
                success: function(data /* , status, jqXHR */) {
                    loader.mTemplate = data;
                },
                dataType: "xml"
            });
        }

        _load_rect($rect, name, props) {
            let x = getAttrN($rect, "x");
            let y = getAttrN($rect, "y");
            let w = getAttrN($rect, "width");
            let h = getAttrN($rect, "height");
            let obj;
            if (/^contour$/iu.test(props.type))
                obj = new Contour(name);
            else
                obj = new Path(name);
            let z = props.depth || 0;
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
            let pts = $poly.getAttribute("points").split(/[,\s]+/u);
            let obj;
            if (/^contour$/iu.test(props.type))
                obj = new Contour(name);
            else
                obj = new Path(name);
            let z = props.depth || 0;
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

        _load_line($line, name, props) {
            let obj = new Path(name);
            let z = props.depth || 0;
            obj.addVertex({
                x: getAttrN($line, "x1"),
                y: getAttrN($line, "y1"),
                z: z
            });
            obj.addVertex({
                x: getAttrN($line, "x2"),
                y: getAttrN($line, "y2"),
                z: z
            });
            return obj;
        }

        // Treat paths as sequences of connected vertices
        _load_path($path, name, props) {
            let dp = new DParser($path.attr("d"));

            if (dp.vertices.length === 0) {
                console.debug("\tempty path ignored");
                return undefined;
            }

            let obj = (/^contour$/iu.test(props.type))
                ? new Contour(name) : new Path(name);
            let z = props.depth || 0;
            for (let v of dp.vertices)
                obj.addVertex({ x: v.x, y: v.y, z: z });
            if (dp.closed)
                obj.close();

            if (obj instanceof Contour)
                obj.setZ(z);

            return obj;
        }

        // Handle circle or ellipse
        _spot($xml, name, props, rx, ry) {
            let cx = getAttrN($xml, "cx");
            let cy = getAttrN($xml, "cy");
            let z = props.depth || 0;

            if (/^poi$/iu.test(props.type))
                return new POI({ x: cx, y: cy, z: z }, name);

            if (/^sounding$/iu.test(props.type))
                return new Sounding({ x: cx, y: cy, z: z }, name);

            // Not tagged as "poi" or "sounding", treat as a contour
            let c = new Contour(name);
            c.setZ(z);
            for (let i = 0; i < 10; i++) {
                let a = i * Math.PI / 5;
                c.addVertex({
                    x: cx + rx * Math.cos(a),
                    y: cy + ry * Math.sin(a)
                });
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
                let ps = {};
                let $desc = $(this).children("desc");
                if ($desc.length > 0)
                    ps = parseProps($desc.text());

                if (/^ignore$/iu.test(ps.type))
                    return;

                let fn = loader[`_load_${this.tagName}`];

                let obj;
                if (fn) {
                    console.debug("Load", ps.type, this.tagName, cname);
                    obj = fn.call(loader, $(this), cname, ps);
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
            $xml.children("metadata")
            .find("dc\\:description")
            .each(function() {
                $.extend(metadata, parseProps($(this).text()));
            });

            // Populate dialog with values from metadata
            let $dlg = $("#svg_dialog");
            for (let f of METADATA)
                if (typeof metadata[f] !== "undefined")
                    $(`#svg_${f}`).val(metadata[f]);

            return new Promise((resolve, reject) => {
                $dlg.dialog("option", "title", `SVG import ${source}`);
                $dlg.dialog("option", "buttons", [
                    {
                        text: "Import",
                        click: function() {
                            $(this).dialog("close");
                            for (let f of METADATA) {
                                let $i = $(`#svg_${f}`);
                                if ($i.attr("type") === "number")
                                    metadata[f] = parseFloat($i.val());
                                else
                                    metadata[f] = $i.val();
                            }
                            resolve();
                        }
                    }
                ]);
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
                let tx = Units.convert(Units.LATLON, metadata, Units.IN);
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
        save(root) {

            // Get position and width/height of the bounding box
            // to set up the transform to SVG units
            let bb = root.boundingBox;

            Units.mapToEX(
                bb,
                10, // SVG 10 pixels-per-metre
                true);

            // Lat/long of the origin
            let llo = Units.convert(Units.IN, bb.min, Units.LATLON);
            let metadata = {
                lat: llo.lat,
                lon: llo.lon,
                x: 0, y: 0, // bottom left corner
                units_per_metre: 10 // px per metre
            };

            // Make a copy of the SVG template document
            let doc = this.mTemplate.cloneNode(true);

            // Build metadata description
            let $svg = $(doc)
            .children("svg")
            .first();
            let metas = [];
            for (let m in metadata)
                metas.push(`${m}:${metadata[m]}`);
            $svg.find("dc\\:description").text(metas.join(","));

            let width = Units.BBwidth(Units.EX);
            $svg.attr("width", width);
            let height = Units.BBheight(Units.EX);
            $svg.attr("height", height);
            $svg.attr("viewBox", `0 0 ${width} ${height}`);
            $svg.attr("sodipodi:docname", root.name);

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
                        vs.push(`${k}:${v}`);
                    else if (typeof v !== "undefined")
                        vs.push(`${k}:"${v}"`);
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
                if (visual instanceof POI || visual instanceof Sounding) {
                    props.type = "poi";
                    let v = Units.convert(
                        Units.IN, visual.position, Units.EX);
                    if (visual instanceof Sounding) {
                        props.type = "sounding";
                        // Convert depth back from SVG units to metres
                        // for the attributes
                        props.depth = -v.z / Units.UPM[Units.EX];
                    }
                    // Make a circle
                    let circ = makeEl("circle", visual, props);
                    circ.setAttribute("cx", v.x);
                    circ.setAttribute("cy", v.y);
                    circ.setAttribute("r", 5);
                    container.appendChild(circ);
                } else if (visual instanceof Path) {
                    props.type = "path";
                    if (visual instanceof Contour) {
                        props.type = "contour";
                        props.depth = -visual.z / Units.UPM[Units.IN];
                    }
                    let path = makeEl("path", visual, props);
                    let lines = ["M"];
                    for (let e of visual.children) {
                        let v = Units.convert(Units.IN, e.position, Units.EX);
                        lines.push(v.x, v.y);
                    }
                    if (visual.isClosed)
                        lines.push("z");
                    path.setAttribute("d", lines.join(" "));
                    path.setAttribute("style", PATH_STYLE);
                    container.appendChild(path);
                }
                else if (visual instanceof Container) {
                    let group = makeEl("g", visual, props);
                    for (let o of visual.children)
                        makeSVG(o, group);
                    container.appendChild(group);
                }
                else if (visual instanceof POI) {
                    let v = Units.convert(Units.IN, visual.position, Units.EX);
                    let circle = makeEl("circle", visual, props);
                    circle.setAttribute("style", POINT_STYLE);
                    circle.setAttribute("cx", v.x);
                    circle.setAttribute("cy", v.y);
                    // Radius 0.25m = 25cm
                    circle.setAttribute("r", Units.UPM[Units.EX] / 4);
                    container.appendChild(circle);
                }
                else
                    throw new Error(
                        `Unsupported Visual ${visual.constructor.name}`);
            }
            for (let o of root.children)
                makeSVG(o, $svg[0]);

            let xml = new XMLSerializer().serializeToString(doc);
            return `<?xml version="1.0" encoding="UTF-8"?>${xml}`;
        }
    }
    return SVG;
});
