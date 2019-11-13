define("js/Vertex", ["three", "js/Visual", "js/Edge"], function(Three, Visual, Edge) {

    const HIGHLIGHT = new Three.MeshBasicMaterial({color: 0xFF0000});
    const NORMAL = new Three.MeshBasicMaterial({color: 0x0000FF});
    
    /**
     * A vertex in a network.
     */
    class Vertex extends Visual {
        /**
         * @param name vertex name (may not be unique)
         * @param v Three.Vector3 position of vertex
         */
        constructor(name, v) {
            super(name);
            this.mCurPos = new Three.Vector3(v.x, v.y, v.z);
            this.mEdges = []; // not OWNED by Vertex, just referred to
        }

        /**
         * @return Three.Vector3 position of vertex
         */
        get position() {
            return this.mCurPos;
        }
        
        // @Override Visual
        get boundingBox() {
            return new Three.Box3(this.mCurPos, this.mCurPos);
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
        
        // @Override Visual
        applyTransform(mat) {
            let p = this.mCurPos.clone();
            p.applyMatrix4(mat);
            this.setPosition(p);
        }

        // @Override Visual
        setHandleSize(s) {
            super.setHandleSize(s);
            if (this.mObject3D) {
                this.mObject3D.scale.x = s;
                this.mObject3D.scale.y = s;
                this.mObject3D.scale.z = s;
            }
        }

        // @Override Visual
        addToScene(scene) {
            this.mGeometry = new Three.SphereGeometry(1);
            this.mObject3D = new Three.Mesh(this.mGeometry, NORMAL);
            let v = this.mCurPos;
            this.mObject3D.position.set(v.x, v.y, v.z);
            this.mObject3D.scale.x = this.handleSize;
            this.mObject3D.scale.y = this.handleSize;
            this.mObject3D.scale.z = this.handleSize;
            scene.add(this.mObject3D);
        }

        // @Override Visual
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

            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }

            if (this.parent)
                this.parent.removeChild(this);
        }

        // @Override Visual
        projectRay(ray) {
            let np = new Three.Vector3();
            ray.closestPointToPoint(this.mCurPos, false, np);
            let dist2 = np.clone().sub(this.mCurPos).lengthSq();
            if (dist2 > 4 * this.handleSize2)
                return null;
            return {
                closest: this,
                dist2: dist2,
                rayPt: np.clone()
            };
        }
        
        /**
         * Set position of vertex
         * @param v Three.Vector3 position
         */
        setPosition(v) {
            // It's important not to blow away the vector object, as
            // it will be used by edges
            this.mCurPos.copy(v);
            if (this.mObject3D)
                this.mObject3D.position.set(v.x, v.y, v.z);
            for (let e of this.mEdges)
                e.vertexMoved();
        }

        // @Override Visual
        highlight(on) {
            if (this.mObject3D)
                this.mObject3D.material = on ? HIGHLIGHT : NORMAL;
        }

        // @Override Visual
        get report() {
            let s = super.report;
            s.push("(" + this.mCurPos.x +
                   "," + this.mCurPos.y +
                   "," + this.mCurPos.z + ")");
            for (let e of this.mEdges)
                s.push("Edge to " + e.otherEnd(this).uid);
            return s;
        }
    }
    return Vertex;
});

