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

        removeFromScene(scene) {
            if (this.mObject3D) {
                scene.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }
        }
        
        needsUpdate() {
            if (this.mGeometry)
                this.mGeometry.verticesNeedUpdate = true;
        }
    }

    return Edge;
});

