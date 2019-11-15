define("js/Edge", ["js/Visual", "three", "js/Materials"], function(Visual, Three, Materials) {

    /**
     * An edge in a Network. Note that edges are Visuals but do
     * not participate in the general object hierarchy; instead they
     * are stored local to Network, and referenced in Vertex.
     */
    class Edge extends Visual {
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
        }

        get p1() { return this.mP1; }

        get p2() { return this.mP2; }

        /**
         * Given an end of this edge, get the other end
         */
        otherEnd(v) {
            return (v === this.mP1) ? this.mP2 : this.mP1;
        }
        
        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mP1.position);
            bb.expandByPoint(this.mP2.position);
            return bb;
        }

        // @Override Visual
        addToScene(scene) {
            this.mGeometry = new Three.Geometry();
            this.mGeometry.vertices.push(this.mP1.position);
            this.mGeometry.vertices.push(this.mP2.position);
            this.mObject3D = new Three.Line(this.mGeometry, Materials.EDGE);
            scene.add(this.mObject3D);
        }

        // @Override Visual
        remove() {
            this.mP1.removeEdge(this);
            this.mP2.removeEdge(this);
            this.parent.removeEdge(this);
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

        // @Override Visual
        highlight(on) {
            if (this.mObject3D) {
                this.mObject3D.material =
                (on ? Materials.EDGE_SELECTED : Materials.EDGE);
            }
        }
        
        // @Override Visual
        projectRay(ray) {
            // TODO:
            return null;
        }
    }

    return Edge;
});

