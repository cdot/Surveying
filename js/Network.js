define("js/Network", ["js/Container", "js/Vertex", "js/Edge", "delaunator"], function(Container, Vertex, Edge, Delaunator) {

    /**
     * A network of interconnected vertices (Vertex) joined by edges (Edge)
     * A network can be a simple path, or could be a mesh.
     */
    class Network extends Container {

        /**
         * @param name network name
         */
        constructor(name) {
            super(name);
            this.mEdges = [];
        }

        // @Override Visual
        prop(k, v) {
            // Impose depth on all children (which will be Vertex)
            if (k === "depth" && typeof v === "number") {
                for (let c of this.children)
                    c.prop(k, v);
            }
            return super.prop(k, v);
        }

        /**
         * Add an edge to the network. The edge must refer to vertices
         * in the network (not in subnets). Two signatures,
         * (Edge) and (Vertex, Vertex)
         */
        addEdge(e, p) {
            if (!(e instanceof Edge))
                e = new Edge(e, p);
            e.setParent(this);
            this.mEdges.push(e);
            return e;
        }

        get edges() {
            return this.mEdges;
        }
        
        // @Override Container
        addToScene(scene) {
            super.addToScene(scene);
            // Add edge lines
            for (let e of this.mEdges)
                e.addToScene(scene);
        }

        // @Override Container
        removeFromScene() {
            super.removeFromScene();
            for (let e of this.mEdges)
                e.removeFromScene(scene);
        }

        // @Override Container
        setHandleScale(s) {
            super.setHandleScale(s);
            for (let e of this.mEdges)
                e.setHandleScale(s);
        }

        // @Override Container
        remove() {
            let es = this.mEdges.slice();
            for (let e of es)
                e.remove();
            super.remove();
        }

        /**
         * Remove the given edge from our edge list
         */
        removeEdge(e) {
            let i = this.mEdges.indexOf(e);
            if (i >= 0)
                this.mEdges.splice(i, 1);
        }
        
        // @Override Container
        projectRay(ray) {
            let best = super.projectRay(ray);

            // Check edges
            for (let e of this.mEdges) {
                let d = e.projectRay(ray);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            return best;
        }

        // @Override Container
        highlight(tf) {
            super.highlight(tf);
            for (let e of this.mEdges)
                e.highlight(tf);
        }

        // @Override Container
        get report() {
            let s = super.report;
            if (this.mEdges.length > 0)
                s.push(this.mEdges.length + " edge"
                       + (this.mEdges.length == 1 ? "" : "s"));
            return s;
        }

        /**
         * Construct a new Network object that contains a Delaunay
         * triangulation of all the Point objects in the container
         * @param a Visual to recursively meshify
         * @return the resulting network
         */
        static meshify(visual) {
            function nextHalfedge(e) {
                return (e % 3 === 2) ? e - 2 : e + 1;
            }

            // Condense isobaths and soundings into a cloud of points
            let coords = [];
            let mapBack = [];
            visual.condense(coords, mapBack);

            let del = Delaunator.from(coords);
            let result = new Network("Triangulation");

            // Construct a mesh, adding condensed points back in as vertices
            for (let i in mapBack) {
                let c = mapBack[i];
                mapBack[i] = c = new Vertex(c.name, c.position);
                result.addChild(c);
            }
            
            // Iterate over the forward edges
            for (let e = 0; e < del.triangles.length; e++) {
                if (e > del.halfedges[e]) {
                    // Not a back-edge
                    let p = mapBack[del.triangles[e]];
                    let q = mapBack[del.triangles[nextHalfedge(e)]];
                    if (!p || !q) debugger;
                    result.addEdge(p, q);
                }
            }
            return result;
        }
    }
    return Network;
});
