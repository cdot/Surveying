define("js/Loaders/svg", ["js/Loaders/XML", "three", "js/Vertex", "js/Edge", "js/Network"], function(XML, Three, Vertex, Edge, Network) {

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

    function applyTransforms(transforms, net) {
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

        // @Override
        load() {

            let id, cmd, i, j, curpos, net;
            
            function addVert() {
                let v = new Vertex(
                    id + ":" + cmd + i + ":" + j++,
                    new Three.Vector3(curpos.x, curpos.y, 0));
                net.addVertex(v);
                return v;
            }
    
            // Kill defs, as they have paths
            for (let def of this.root.getElementsByTagName("defs")) {
                def.parentNode.removeChild(def);
            }
            
            // Process paths
            let nets = [];
            for (let path of this.root.getElementsByTagName("path")) {
                id = path.getAttribute("id") || this.nextNet();
                net = new Network(id);
                let points = path.getAttribute("d").split(" ");
                curpos = { x: 0, y: 0 };
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
                            net.addEdge(new Edge(lastVert, v));
                        lastVert = v;
                        while (isXY(points[i])) {
                            p = getXY(points[i++]);
                            if (/[A-Z]/.test(cmd)) curpos = p;
                            else { curpos.x += p.x; curpos.y += p.y; }
                            v = addVert();
                            net.addEdge(new Edge(lastVert, v));
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
                            net.addEdge(new Edge(lastVert, v));
                            lastVert = v;
                        }
                        break;
                        
                    case "Z": case "z": // close path
                        if (lastVert && startVert) {
                            net.addEdge(new Edge(lastVert, startVert));
                            lastVert = startVert;
                            curpos = lastVert.current;
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
                applyTransforms(path.getAttribute("transform"), net);

                // Hack - Transform and scale into geocoordinates
                let mat = new Three.Matrix3();
                mat.set(1, 0, -626.28561,
                        0, 1, -898.55308,
                        0, 0, 1);
                net.applyTransform(mat);
                
                mat.set(0.00000138, 0, 0,
                        0, -0.00000085, 0,
                        0, 0, 1);
                net.applyTransform(mat);

                mat.set(1, 0, -2.7306072,
                        0, 1, 53.6293272,
                        0, 0, 1);
                net.applyTransform(mat);

                nets.push(net);
            }
            return nets;
        }
    }
    return SVG;
});
