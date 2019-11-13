define("js/Network", ["three", "js/Container"], function(Three, Container) {
    
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

        /**
         * Add an edge to the network. The edge must refer to vertices
         * in the network (not in subnets)
         */
        addEdge(e) {
            e.setParent(this);
            this.mEdges.push(e);
            return e;
        }

        get edges() {
            return this.mEdges;
        }
        
        /**
         * Add the Three.Object3D representation of the vertices and
         * edges of this network to the given scene
         */
        // @Override Container
        addToScene(scene) {
            super.addToScene(scene);
            // Add edge lines
            for (let e of this.mEdges)
                e.addToScene(scene);
        }

        // @Override Container
        setHandleSize(s) {
            super.setHandleSize(s);
            for (let e of this.mEdges)
                e.setHandleSize(s);
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
    }
    return Network;
});
