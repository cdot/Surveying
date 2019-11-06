define("js/Loaders/svg", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network", "js/ImagePlane"], function(XML, Three, Vertex, Edge, Network, ImagePlane) {

    function isXY(d) {
        return (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?,[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(d));
    }

    function isN(d) {
        return (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(d));
    }

    function getXY(d) {
        let xy = d.split(",");
        return { x: parseFloat(xy[0]), y: parseFloat(xy[1]) };
    }

    function getN(d) {
        return parseFloat(d);
    }

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

        constructor(source, data) {
            super(source, data, "svg");
        }

        loadPath($path) {
            let $title = $path.children("title");
            let id = $title.text() || $path.attr("id") || this.nextNet();
            console.debug("Loading path", id);
            let path = new Network(id);
            let curpos = { x: 0, y: 0 };

            let cmd, i, j;
            function addVert() {
                let v = new Vertex(
                    id + ":" + cmd + i + ":" + j++,
                    new Three.Vector3(curpos.x, curpos.y, 0));
                path.addObject(v);
                return v;
            }

            if (!$path.attr("d")) debugger;
            let points = $path.attr("d").split(" ");
            let startVert, lastVert, p, v;
            i = 0;
            let vertices = [];
            
            while (i < points.length) {
                cmd = points[i++];
                j = 0;
                switch (cmd) {

                case "L": case "M":
                case "l": case "m":
                    p = getXY(points[i++]);
                    if (/[A-Z]/.test(cmd)) curpos = p;
                    else { curpos.x += p.x; curpos.y += p.y; }
                    v = addVert();
                    if (!startVert) startVert = v;
                    if (lastVert && (cmd === "L" || cmd === "l"))
                        path.addEdge(new Edge(lastVert, v));
                    lastVert = v;
                    while (isXY(points[i])) {
                        p = getXY(points[i++]);
                        if (/[A-Z]/.test(cmd)) curpos = p;
                        else { curpos.x += p.x; curpos.y += p.y; }
                        v = addVert();
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "H": case "V":
                case "h": case "v":
                    p = getN(points[i++]);
                    switch (cmd) {
                    case "H": curpos.x = p; break;
                    case "V": curpos.y = p; break;
                    case "h": curpos.x += p; break;
                    case "v": curpos.y += p; break;
                    }
                    v = addVert();
                    lastVert = v;
                    if (!startVert) startVert = v;
                    while (isN(points[i])) {
                        p = getN(points[i++]);
                        switch (cmd) {
                        case "H": curpos.x = p; break;
                        case "V": curpos.y = p; break;
                        case "h": curpos.x += p; break;
                        case "v": curpos.y += p; break;
                        }
                        v = addVert();
                        path.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                    }
                    break;
                    
                case "Z": case "z": // close path
                    if (lastVert && startVert) {
                        path.addEdge(new Edge(lastVert, startVert));
                        lastVert = startVert;
                        curpos = lastVert.position;
                    }
                    break;

                case "Q": case "q":
                case "T": case "t":
                case "C": case "c":
                case "S": case "s": // curves - ignore
                    while (isXY(points[0]))
                        points[i++];
                    break;
                    
                case "A": case "a": // arcs - ignore
                    i++; // rx
                    i++; // ry
                    i++; // angle
                    i++; // large-arc-flag
                    i++; // sweep-flag
                    lastVert = addVert();
                    if (cmd === "A") {
                        curpos.x = getN(points[i++]); // x
                        curpos.y = getN(points[i++]); // y
                    } else {
                        curpos.x += getN(points[i++]); // x
                        curpos.y += getN(points[i++]); // y
                    }
                    break;
                }
            }
            return path;
        }
        
        // @Override
        load() {
            let loader = this;
            // Process paths
            let objects = [];
            this.$xml.children().each(function() {
                let object;
                
                switch (this.tagName) {
                case"image":
                    let $image = $(this);
                    //let url = $image.attr("xlink:href");
                    let url = "data/Eccy.png";
                    let x = parseFloat($image.attr("x"));
                    let y = parseFloat($image.attr("y"));
                    let h = parseFloat($image.attr("height"));
                    let w = parseFloat($image.attr("width"));
                    object = new ImagePlane(url, new Three.Vector3(x, y, 0),
                                            new Three.Vector3(x + w, y + h, 0));
                    break;
                    
                case "path":
                    object = loader.loadPath($(this));
                    break;

                default:
                    console.debug("Ignore " + this.tagName);
                    return;
                }

                applySVGTransforms($(this).attr("transform"), object);

                // Hack - Transform and scale into geocoordinates
                let mat = new Three.Matrix3();
                mat.set(1, 0, -626.28561,
                        0, 1, -898.55308,
                        0, 0, 1);
                object.applyTransform(mat);
                
                mat.set(0.00000138, 0, 0,
                        0, -0.00000085, 0,
                        0, 0, 1);
                object.applyTransform(mat);

                mat.set(1, 0, -2.7306072,
                        0, 1, 53.6293272,
                        0, 0, 1);
                object.applyTransform(mat);

                objects.push(object);
            });
            return objects;
        }
    }
    return SVG;
});
