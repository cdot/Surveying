define("js/Vertex", ["js/Point", "three", "js/Materials", "js/Edge"], function(Point, Three, Materials, Edge) {
    
    // Every Visual is uniquely numbered within this system
    let counter = 1;

    /**
     * A vertex in a Network. A vertex is a Point with edges and
     * slightly different highlighting behaviours (it is rmeoved from
     * the scene when highlight is off)
     */
    class Vertex extends Point {
        /**
         * @param name vertex name (may not be unique)
         * @param v Three.Vector3 position of vertex
         */
        constructor(name, v) {
            super(name, v);
            this.mVid = counter++;
            // Edges are not OWNED by Vertex, just referred to. They
            // are owned by the parent Networl.
            this.mEdges = [];
            this.prop("type", "vertex");
        }

        /**
         * Get the unique identifier of this vertex.
         * Vids are allocated when scenes are loaded.
         * @return unique number identifying this vertex
         */
        get vid() {
            return this.mVid;
        }

        /**
         * Add a reference to an edge that ends on this vertex
         */
        addEdge(e) {
            this.mEdges.push(e);
        }

        /**
         * Remove a reference to an edge, if it's there
         */
        removeEdge(e) {
            let i = this.mEdges.indexOf(e);
            if (i >= 0)
                this.mEdges.splice(i, 1);
        }
        
        // @Override Point
        addToScene(scene) {
            // A vertex only has a visual representation when
            // it is highlighted
            this.mScene = scene;
        }

        // @Override Point
        remove() {
            let es = this.mEdges.slice();
            if (es.length === 2) {
                let p0 = es[0].otherEnd(this);
                let p1 = es[1].otherEnd(this);
                let nedge = new Edge(p0, p1);
                this.parent.addEdge(nedge);
                if (this.object3D)
                    nedge.addToScene(this.object3D.parent);
            }
            for (let e of es)
                e.remove();
            
            this.mEdges = [];

            super.remove();
        }

        // @Override Point
        setPosition(v) {
            super.setPosition(v);
            for (let e of this.mEdges)
                e.vertexMoved();
        }

        // @Override Point
        highlight(on) {
            if (!on) {
                if (this.object3D && this.object3D.parent)
                    this.object3D.parent.remove(this.object3D);
                return;
            }

            if (!this.mScene)
                return;

            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                super.addToScene(this.mScene);
                super.highlight(on);
            } else
                this.mScene.add(this.object3D);
        }

        // @Override Point
        get report() {
            let s = super.report;
            s.push("vertex: " + this.mVid);
            for (let e of this.mEdges)
                s.push("Edge to " + e.otherEnd(this).vid);
            return s;
        }

        // @Override Point
        condense(coords, mapBack) {
            if (this.parent && this.parent.prop("type") === "isobath")
                super.condense(coords, mapBack);
            else
                console.log("Parent of",this.name,"NOT ISOBATH");
        }
    }
    return Vertex;
});

