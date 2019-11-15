define("js/Point", ["js/Visual", "three", "js/Materials"], function(Visual, Three, Materials) {

    /**
     * An isolated point
     */
    class Point extends Visual {
        /**
         * @param name vertex name (may not be unique)
         * @param v Three.Vector3 position of vertex
         */
        constructor(name, v) {
            super(name);
            this.mCurPos = new Three.Vector3(v.x, v.y, v.z);
            // {Three.SphereGeometry} this.mGeometry
            // {Three.Mesh} this.mObject3D
            // {Three.Scene} this.mScene
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

        // @Override Visual
        applyTransform(mat) {
            let p = this.mCurPos.clone();
            p.applyMatrix4(mat);
            this.setPosition(p);
        }

        // @Override Visual
        setHandleScale(s) {
            super.setHandleScale(s);
            if (this.mObject3D) {
                this.mObject3D.scale.x = this.handleScale;
                this.mObject3D.scale.y = this.handleScale;
                this.mObject3D.scale.z = this.handleScale;
            }
        }
        
        // @Override Visual
        addToScene(scene) {
            if (!this.mObject3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.mGeometry = new Three.SphereGeometry(1);
                this.mObject3D = new Three.Mesh(this.mGeometry, Materials.POINT);

                let v = this.mCurPos;
                this.mObject3D.position.set(v.x, v.y, v.z);
                this.mObject3D.scale.x = this.handleScale;
                this.mObject3D.scale.y = this.handleScale;
                this.mObject3D.scale.z = this.handleScale;
            }
            scene.add(this.mObject3D);
        }

        // @Override Visual
        remove() {
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
            if (dist2 > 4 * this.handleScale2)
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
            this.mCurPos.copy(v);
            if (this.mObject3D)
                this.mObject3D.position.set(v.x, v.y, v.z);
        }

        // @Override Visual
        highlight(on) {
            if (this.mObject3D) {
                this.mObject3D.material =
                (on ? Materials.POINT_SELECTED : Materials.POINT);
            }
        }

        // @Override Visual
        get report() {
            let s = super.report;
            s.push("(" + this.mCurPos.x +
                   "," + this.mCurPos.y +
                   "," + this.mCurPos.z + ")");
            return s;
        }
    }
    return Point;
});

