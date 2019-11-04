define("js/Edge", ["three"], function(Three) {

    const LINE = new Three.LineBasicMaterial({color: 0x00FF00});
    
    /**
     * An edge in a network
     */
    class Edge {
        /**
         * @param p1 Vertex
         * @param p2 Vertex
         */
        constructor(p1, p2) {
            this.mP1 = p1;
            p1.addEdge(this);
            this.mP2 = p2;
            p2.addEdge(this);
        }

        get p1() {
            return this.mP1;
        }

        get p2() {
            return this.mP2;
        }
        
        makeDOM(doc) {
            let el = doc.createElement("edge");
            el.setAttribute("p1", this.mP1.id);
            el.setAttribute("p2", this.mP2.id);
            return el;
        }
        
        /**
         * Get the Object3D used to display this edge
         */
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
        remove() {
            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }
        }
        
        needsUpdate() {
            if (this.mGeometry)
                this.mGeometry.verticesNeedUpdate = true;
        }

        scale(s) {
            // Closeness for click test
            this.mDot2 = 4 * s * s;
        }

        highlight() {
            // TODO:
        }
        
        projectRay(ray) {
            // TODO:
            return null;
        }
    }

    return Edge;
});

