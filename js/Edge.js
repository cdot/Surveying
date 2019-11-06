define("js/Edge", ["three", "js/GraphElement"], function(Three, GraphElement) {

    const NORMAL = new Three.LineBasicMaterial({color: 0x00FF00});
    const HIGHLIGHT = new Three.LineBasicMaterial({color: 0xFF00FF});
    
    /**
     * An edge in a network. Note that edges are GraphElements but do
     * not participate in the general object hierarchy; instead they
     * are stored local to Network, and referenced in Vertex.
     */
    class Edge extends GraphElement {
        /**
         * @param p1 Vertex
         * @param p2 Vertex
         */
        constructor(p1, p2) {
            super(); // edges have no name
            this.mP1 = p1;
            p1.addEdge(this);
            this.mP2 = p2;
            p2.addEdge(this);
            this.mDot2 = 1;
        }

        // @Override GraphElement
        get tag() { return "edge"; }

        get p1() { return this.mP1; }

        get p2() { return this.mP2; }

        /**
         * Given an end of this edge, get the other end
         */
        otherEnd(v) {
            return (v === this.mP1) ? this.mP2 : this.mP1;
        }
        
        // @Override GraphElement
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mP1.position);
            bb.expandByPoint(this.mP2.position);
            return bb;
        }

        // @Override GraphElement
        makeDOM(doc) {
            let el = super.makeDOM();
            el.setAttribute("id", this.uid);
            el.setAttribute("p1", this.mP1.uid);
            el.setAttribute("p2", this.mP2.uid);
            return el;
        }
        
        // @Override GraphElement
        addToScene(scene) {
            this.mGeometry = new Three.Geometry();
            this.mGeometry.vertices.push(this.mP1.position);
            this.mGeometry.vertices.push(this.mP2.position);
            this.mObject3D = new Three.Line(this.mGeometry, NORMAL);
            scene.add(this.mObject3D);
        }

        // @Override GraphElement
        remove() {
            this.mP1.removeEdge(this);
            this.mP2.removeEdge(this);
            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }
        }

        /**
         * Called from Vertex when a vertex on this edge moves
         */
        vertexMoved() {
            if (this.mGeometry)
                this.mGeometry.verticesNeedUpdate = true;
        }

        // @Override GraphElement
        scale(s) {
            // Closeness for click test
            this.mDot2 = 4 * s * s;
        }

        // @Override GraphElement
        highlight(on) {
            if (this.mObject3D)
                this.mObject3D.material = on ? HIGHLIGHT : NORMAL;
        }
        
        // @Override GraphElement
        projectRay(ray) {
            // TODO:
            return null;
        }
    }

    return Edge;
});

