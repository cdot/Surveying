define("js/Vertex", ["three"], function(Three) {

    const HIGHLIGHT = new Three.MeshBasicMaterial({color: 0xFF0000});
    const NORMAL = new Three.MeshBasicMaterial({color: 0x0000FF});
    
    /**
     * A vertex in a network.
     */
    class Vertex {
        /**
         * @param id vertex identifier
         * @param v Three.Vector3 position of vertex
         */
        constructor(id, v) {
            this.mId = id;
            this.mCurPos = new Three.Vector3(v.x, v.y, v.z);
            this.mEdges = [];
            this.mLocked = false;
        }

        makeDOM(doc) {
            let el = doc.createElement("node");
            el.setAttribute("id", this.id);
            el.setAttribute("x", this.mCurPos.x);
            el.setAttribute("y", this.mCurPos.y);
            el.setAttribute("z", this.mCurPos.z);
            return el;
        }
        
        get id() {
            return this.mId;
        }

        get parent() {
            return this.mParent;
        }

        set parent(p) {
            this.mParent = p;
        }
        
        /**
         * Add a reference to an edge that ends on this vertex
         */
        addEdge(e) {
            this.mEdges.push(e);
        }

        applyTransform(mat) {
            let p = this.mCurPos.clone();
            if (mat instanceof Three.Matrix3) {
                // 2D transform
                let e = mat.elements;
                let x = p.x, y = p.y;
                p.x = x * e[0] + y * e[3] + e[6];
                p.y = x * e[1] + y * e[4] + e[7];
            } else
                p.applyMatrix4(mat);
            
            this.current = p;
        }
        
        /**
         * Scale the spot
         */
        scale(s) {
            //            this.mGeometry.scale(s, s, s);
            this.mObject3D.scale.x = s;
            this.mObject3D.scale.y = s;
            this.mObject3D.scale.z = s;
            // Closeness for click test
            this.mDot2 = 4 * s * s;
        }
        
        addToScene(scene) {
            this.mGeometry = new Three.BoxGeometry(1, 1, 1);
            this.mObject3D = new Three.Mesh(this.mGeometry, NORMAL);
            let v = this.mCurPos;
            this.mObject3D.position.set(v.x, v.y, v.z);
            scene.add(this.mObject3D);
        }

        removeFromScene(scene) {
            for (let e of this.mEdges)
                e.removeFromScene(scene);

            if (this.mObject3D) {
                scene.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }
        }

        /**
         * See if the given ray "hits" this vertex
         * @return {
         *     Vertex closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} rayPt closest point on the ray
         * } or null if it's too far away
         */
        projectRay(ray) {
            let np = new Three.Vector3();
            ray.closestPointToPoint(this.mCurPos, false, np);
            let dist2 = np.clone().sub(this.mCurPos).lengthSq();
            if (dist2 > this.mDot2)
                return null;
            return {
                closest: this,
                dist2: dist2,
                rayPt: np.clone()
            };
        }
        
        /*
         * @param v Three.Vector3 set current position of vertex
         */
        set current(v) {
            this.mCurPos.copy(v);
            if (this.mObject3D)
                this.mObject3D.position.set(v.x, v.y, v.z);
            for (let e of this.mEdges)
                e.needsUpdate();
        }

        /**
         * @return Three.Vector3 current position of vertex
         */
        get current() {
            return this.mCurPos;
        }
        
        highlight(on) {
            if (this.mObject3D)
                this.mObject3D.material = on ? HIGHLIGHT : NORMAL;
        }
    }
    return Vertex;
});

