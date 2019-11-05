define("js/Edge", ["three", "js/GraphElement"], function(Three, GraphElement) {

    const LINE = new Three.LineBasicMaterial({color: 0x00FF00});
    
    /**
     * An edge in a network
     */
    class Edge extends GraphElement {
        /**
         * @param p1 Vertex
         * @param p2 Vertex
         */
        constructor(p1, p2) {
            super();
            this.mP1 = p1;
            p1.addEdge(this);
            this.mP2 = p2;
            p2.addEdge(this);
        }

        // @Override
        get tag() { return "edge"; }

        get p1() { return this.mP1; }

        get p2() { return this.mP2; }

        otherEnd(v) {
            return (v === this.mP1) ? this.mP2 : this.mP1;
        }
        
        /**
         * Make the DOM for saving in a .survey document
         */
        // @Override
        makeDOM(doc) {
            let el = super.makeDOM();
            el.setAttribute("id", this.uid);
            el.setAttribute("p1", this.mP1.uid);
            el.setAttribute("p2", this.mP2.uid);
            return el;
        }
        
        /**
         * Get the Object3D used to display this edge
         */
        // @Override
        addToScene(scene) {
            this.mGeometry = new Three.Geometry();
            this.mGeometry.vertices.push(this.mP1.current);
            this.mGeometry.vertices.push(this.mP2.current);
            this.mObject3D = new Three.Line(this.mGeometry, LINE);
            scene.add(this.mObject3D);
        }

        /**
         * Remove this edge from the scene graph,
         * if it's there. Edges are managed by the network they
         * are contained within, so this will not remove the
         * edge from the containing network.
         */
        // @Override
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

        // @Override
        scale(s) {
            // Closeness for click test
            this.mDot2 = 4 * s * s;
        }

        // @Override
        highlight() {
            // TODO:
        }
        
        // @Override
        projectRay(ray) {
            // TODO:
            return null;
        }
    }

    return Edge;
});

