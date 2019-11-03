define("js/Vertex", ["three", "js/Draggable"], function(Three, Draggable) {

    const HIGHLIGHT = new Three.MeshBasicMaterial({color: 0xFF0000});
    const NORMAL = new Three.MeshBasicMaterial({color: 0x0000FF});
    
    /**
     * A vertex in a network.
     */
    class Vertex extends Draggable {
        /**
         * @param id vertex identifier
         * @param v Three.Vector3 position of vertex
         */
        constructor(id, v) {
            super();
            this.mId = id;
            this.mCurPos = new Three.Vector3(v.x, v.y, v.z);
            this.mEdges = [];
            this.mLocked = false;
        }

        get id() {
            return this.mId;
        }

        get parent() {
            return this.mGroup;
        }

        set parent(p) {
            this.mGroup = p;
        }
        
        /**
         * Add a reference to an edge that ends on this vertex
         */
        addEdge(e) {
            this.mEdges.push(e);
        }

        applyTransform(mat) {
            if (mat instanceof Three.Matrix3) {
                // 2D transform
                let e = mat.elements;
                let x = this.mCurPos.x, y = this.mCurPos.y;
                this.mCurPos.x = x * e[0] + y * e[3] + e[6];
                this.mCurPos.y = x * e[1] + y * e[4] + e[7];
            } else
                this.mCurPos.applyMatrix4(mat);
        }
        
        /**
         * Scale the spot
         */
        scale(s) {
            //            this.mGeometry.scale(s, s, s);
            this.mObject3D.scale.x = s;
            this.mObject3D.scale.y = s;
            this.mObject3D.scale.z = s;
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
         * @Override Draggable
         */
        dragTo(v) {
            this.current = v;
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

