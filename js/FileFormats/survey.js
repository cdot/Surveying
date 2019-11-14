define("js/FileFormats/survey", ["js/FileFormats/XML", "three", "js/Vertex", "js/Edge", "js/Container", "js/Network", "js/ImagePlane", "js/Survey"], function(XML, Three, Vertex, Edge, Container, Network, ImagePlane, Survey) {

    class SURVEY extends XML {

        constructor() {
            super("survey");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);
            
            function loadNetwork($net) {
                let id = $net.attr("id");
                let net = new Network(id);
                let nodes = {};
                $net.children("node").each(function() {
                    let $nd = $(this);
                    let id = $nd.attr("id");
                    let name = $nd.attr("name");
                    let x = parseFloat($nd.attr("x"));
                    let y = parseFloat($nd.attr("y"));
                    let z = parseFloat($nd.attr("z"));
                    let v = new Vertex(name, new Three.Vector3(x, y, z));
                    net.addChild(v);
                    nodes[id] = v;
                });
                $net.children("image").each(function() {
                    let $nd = $(this);
                    let filename = $nd.attr("filename");
                    let min = new Three.Vector3();
                    let max = new Three.Vector3();
                    $nd.children("min").first().each(function() {
                        let $m = $(this);
                        min.x = parseFloat($m.attr("x"));
                        min.y = parseFloat($m.attr("y"));
                        min.z = parseFloat($m.attr("z"));
                    });
                    $nd.children("max").first().each(function() {
                        let $m = $(this);
                        max.x = parseFloat($m.attr("x"));
                        max.y = parseFloat($m.attr("y"));
                        max.z = parseFloat($m.attr("z"));
                    });
                    net.addChild(new ImagePlane(filename, min, max));
                });
                $net.children("network").each(function() {
                    net.addChild(loadNetwork($(this)));
                });
                $net.children("edge").each(function() {
                    let $edge = $(this);
                    let n1 = nodes[$edge.attr("p1")];
                    if (!n1)
                        throw new Error("Corrupt survey; " + n1 + " missing");
                    let n2 = nodes[$edge.attr("p2")];
                    if (!n2)
                        throw new Error("Corrupt survey; " + n2 + " missing");
                    net.addEdge(new Edge(n1, n2));
                });
                return net;
            }
            
            let nets = new Container(source);
            let loader = this;
            $xml.children("network").each(function() {
                content.addChild(loadNetwork($(this)));
            });
            return Promise.resolve(nets);
        }

        save(visual) {
            function makeDOM(visual, doc) {
                let dom;

                if (visual instanceof ImagePlane) {
                    dom = doc.createElement("image");
                    dom.setAttribute("filename", visual.filename);
                    let bb = visual.boundingBox;
                    let dd = doc.createElement("min");
                    dd.setAttribute("x", bb.min.x);
                    dd.setAttribute("y", bb.min.y);
                    dd.setAttribute("z", bb.min.z);
                    dom.append(dd);
                    dd = doc.createElement("max");
                    dd.setAttribute("x", bb.max.x);
                    dd.setAttribute("y", bb.max.y);
                    dd.setAttribute("z", bb.max.z);
                    dom.append(dd);
                } else if (visual instanceof Vertex) {
                    dom = doc.createElement("node");
                    let p = visual.position;
                    dom.setAttribute("x", p.x);
                    dom.setAttribute("y", p.y);
                    dom.setAttribute("z", p.z);
                } else if (visual instanceof Edge) {
                    dom = doc.createElement("edge");
                    dom.setAttribute("id", visual.uid);
                    dom.setAttribute("p1", visual.p1.uid);
                    dom.setAttribute("p2", visual.p2.uid);
                } else if (visual instanceof Container) {
                    if (visual instanceof Survey) {
                        dom = doc.createElement("survey");
                        if (visual.metadata)
                            dom.setAttribute(
                                "metadata", JSON.stringify(visual.metadata));
                    } else if (visual instanceof Network)
                        dom = doc.createElement("network");
                    else
                        dom = doc.createElement("container");
                    for (let g of visual.children)
                        dom.append(makeDOM(g, doc));
                    if (visual instanceof Network)
                        for (let e of visual.edges)
                            dom.append(makeDOM(e, doc));
                } else
                    throw new Error("Unsupported Visual " + visual);
                if (visual.name)
                    dom.setAttribute("name", visual.name);
                dom.setAttribute("id", visual.uid);
                return dom;
            }

            let doc = document.implementation.createDocument("", "", null);
            doc.append(makeDOM(visual, doc));
            return Promise.resolve(
                '<?xml version="1.0" encoding="UTF-8"?>'
                +  new XMLSerializer().serializeToString(doc));
        }

    }
    return SURVEY;
});

