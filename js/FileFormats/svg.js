define("js/FileFormats/svg", ["js/FileFormats/XML", "three", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/ImagePlane", "js/UTM", "jquery-ui"], function(XML, Three, Vertex, Edge, Container, Network, ImagePlane, UTM) {

    /**
     * Specialised loader for an SVG used to carry survey information.
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
     */

    const IS_NUMBER = /^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/;
    const IS_COORDS = /^[-+]?\d*\.?\d+([eE][-+]?\d+)?,[-+]?\d*\.?\d+([eE][-+]?\d+)?$/;
    
    // Styling for paths in output SVG
    const PATH_STYLE =
          "display:inline;fill:none;stroke:#FF00FF:none;stroke-width:1px;stroke-opacity:1";
    const SVG_NS = 'http://www.w3.org/2000/svg';
    
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

    /**
     * Parse a string of comma-separated key:value pairs from a string
     */
    function parseAttrs(text) {
        let re = /(^|\s*,)\s*(\w+)\s*:\s*((["']).*?\4|[^,\s]*)/g;
        let m;
        let attrs = {};
        while (m = re.exec(text)) {
            let k = m[2];
            let v = m[3];
            if (IS_NUMBER.test(v))
                attrs[k] = parseFloat(v);
            else // quoted numbers are treated as strings
                attrs[k] = v.replace(/^(["'])(.*)\1/, "$2");
        }
        return attrs;
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
                    while (IS_COORDS.test(points[0])) {
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
                    while (IS_NUMBER.test(points[0])) {
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
                    while (IS_COORDS.test(points[0])) {
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

            applySVGTransforms($(this).attr("transform"), path);
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
            let plane = new ImagePlane(
                url,
                new Three.Vector3(x, y, attrs.depth),
                new Three.Vector3(x + w, y + h, -attrs.depth));
            applySVGTransforms($(this).attr("transform"), plane);
            return plane;
         }
        
        loadGroup($xml) {
            let loader = this;
            let group = new Container($(this).attr("id"));
            $xml.children().each(function() {
                let object, attrs = { depth: 0 };
                
                let $desc = $(this).children("desc");
                if ($desc.length > 0)
                    attrs = $.extend(attrs, parseAttrs($desc.text()));
                
                switch (this.tagName) {                    
                case"image":
                    group.addChild(loader.loadImage($(this), attrs));
                    break;
                    
                case "g":
                    group.addChild(loader.loadGroup($(this)));
                    break;

                case "path":
                    group.addChild(loader.loadPath($(this), attrs));
                    break;

                default:
                    console.debug("Ignore " + this.tagName);
                    return;
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
                $.extend(metadata, parseAttrs($(this).text()));
            });

            // Seed the utm zone if it's not already been done
            UTM.fromLatLong(metadata.lat, metadata.lon);
            
            // Populate dialog with values from metadata
            let $dlg = $("#svg_dialog");
            for (let f of [ "lat", "lon", "x", "y", "units_per_metre" ])
                if (typeof metadata[f] !== "undefined") $('#svg_' + f).val(metadata[f]);

            // Export button not used here
            $("#svg_export").hide();
            
            return new Promise((resolve, reject) => {
                $dlg.dialog("option", "title", "SVG import " + source);
                $dlg.dialog("option", "buttons", [
                    {
                        text: "Import",
                        click: function() {
                            $(this).dialog("close");
                            for (let f of [ "lat", "lon", "x", "y", "units_per_metre" ]) {
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
                let g = this.loadGroup($xml);
                let mats = [];

                // SVG coords have 0,0, at the top left, so
                // flip the Y axis so that the bottom left becomes 0, 0
                let height = parseFloat($xml.attr("height"));
                mats.push(new Three.Matrix4().makeScale(1, -1, 1));
                mats.push(new Three.Matrix4().makeTranslation(0, height, 1));

                // Translate reference point to 0, 0
                if (metadata.x !== 0 || metadata.y !== 0)
                    mats.push(new Three.Matrix4().makeTranslation(
                        -metadata.x, -metadata.y, 0));

                // Scale and flip y
                let scale = 1 / metadata.units_per_metre;
                if (scale !== 1)
                    mats.push(new Three.Matrix4().makeScale(scale, scale, 1));

                // Translate reference point to reference lat,lon
                let utm = UTM.fromLatLong(metadata.lat, metadata.lon);
                mats.push(new Three.Matrix4().makeTranslation(utm.easting, utm.northing, 0));

                for (let m of mats)
                    g.applyTransform(m);
                return g;
            });
        }

        _serialise(visual, metadata) {
            let origin = UTM.fromLatLong(metadata.lat, metadata.lon);
            let mump = metadata.units_per_metre;
            
            function saveUnits(p) {
                if (p instanceof Three.Box3)
                    return new Three.Box3(saveUnits(p.min), saveUnits(p.max));
                return new Three.Vector3(
                    (p.x - origin.easting) * mump,
                    (p.y - origin.northing) * mump,
                    0);
            }
            
            let doc = this.mTemplate.cloneNode(true);
            let $svg = $(doc).children("svg").first();
            let bb = visual.boundingBox;
            let ll = new UTM(bb.min.x, bb.min.y).toLatLong();
            let metas = [];
            for (let m in metadata)
                metas.push(m + ":" + metadata[m]);                
            $svg.find("dc\\:description").text(metas.join(","));

            ll = saveUnits(bb.min);
            let ur = saveUnits(bb.max);
            $svg.attr("width", ur.x - ll.x);
            let height = ur.y - ll.y;
            $svg.attr("height", height);
            $svg.attr("viewBox", ll.x + " " + ll.y + " "
                      + ur.x + " " + ur.y);
            $svg.attr("sodipodi:docname", visual.name);
            
            function makeSVG(visual, container) {

                if (visual instanceof Network) {
                    // Make a path
                    let path = document.createElementNS(SVG_NS, "path");
                    if (visual.name)
                        path.setAttribute("name", visual.name);
                    path.setAttribute("id", visual.name);
                    let moves = [ "M" ];
                    for (let o of visual.children) {
                        if (o instanceof Vertex) {
                            let v = saveUnits(o.position);
                            moves.push(v.x + " " + (height - v.y));
                        } else
                            console.debug("Unsupported Network Visual " + o);
                    }
                    path.setAttribute("d", moves.join(" "));
                    path.setAttribute("style", PATH_STYLE);
                    container.appendChild(path);
                } else if (visual instanceof Container) {
                    let group = document.createElementNS(SVG_NS, "g");
                    group.setAttribute("id", visual.name);
                    for (let o of visual.children)
                        makeSVG(o, group);
                    container.appendChild(group);
                } else if (visual instanceof ImagePlane) {
                    console.debug("Reminder: support ImagePlane");
                } else {
                    console.debug("Unsupported Visual " + visual);
                }
            }
            debugger;
            for (let o of visual.children)
                makeSVG(o, $svg[0]);
            return '<?xml version="1.0" encoding="UTF-8"?>'
            +  new XMLSerializer().serializeToString(doc);
        }

        // @Override FileFormat
        save(visual) {
            let saver = this;
            let $dlg = $("#svg_dialog");
            
            $dlg.dialog("option", "title", "SVG export");
            // Clear the button panel
            $dlg.dialog("option", "buttons", []);
            $("#svg_export")
            .show()
            .on("click", function() {
                let metadata = {};
                for (let f of [ "lat", "lon", "x", "y", "units_per_metre" ]) {
                    let $i = $('#svg_' + f);
                    if ($i.attr("type") === "number")
                        metadata[f] = parseFloat($i.val());
                    else
                        metadata[f] = $i.val();
                }
                this.href = URL.createObjectURL(new Blob([saver._serialise(visual, metadata)]));
                this.download = "svg." + $("#save_format").val();
                // Pass on for native event handling
                return true;
            })
            $dlg.dialog("open");
            // Tell the caller not to bother trying to save the content, we're doing it
            // through the dialog
            return null;
        }
    }
    return SVG;
});
