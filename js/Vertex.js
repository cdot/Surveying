define("js/Vertex", ["js/Point", "three", "js/Materials", "js/Edge"], function(Point, Three, Materials, Edge) {
    
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
            // Edges are not OWNED by Vertex, just referred to. They
            // are owned by the parent Networl.
            this.mEdges = [];
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
                if (this.mObject3D)
                    nedge.addToScene(this.mObject3D.parent);
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
                if (this.mObject3D && this.mObject3D.parent)
                    this.mObject3D.parent.remove(this.mObject3D);
                return;
            }

            if (!this.mScene)
                return;

            if (!this.mObject3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                super.addToScene(this.mScene);
                super.highlight(on);
            } else
                this.mScene.add(this.mObject3D);
        }

        // @Override Point
        get report() {
            let s = super.report;
            for (let e of this.mEdges)
                s.push("Edge to " + e.otherEnd(this).uid);
            return s;
        }
    }
    return Vertex;
});

