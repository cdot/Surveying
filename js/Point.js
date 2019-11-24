define("js/Point", ["js/Visual", "three", "js/UTM", "js/Materials"], function(Visual, Three, UTM, Materials) {

    /**
     * Base class of points. The default behaviour is a point sounding i.e
     * a point that stands on it's own as an object in a scene. Vertex
     * is subclassed off this to add behaviours for a point in a path/mesh.
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
            // {Three.Scene} this.mScene
            this.prop("type", "point");
            super.prop("depth", v.z);
        }

        // @Override Visual
        prop(k, v) {
            if (k === "depth" && typeof v === "number") {
                this.setPosition(this.mCurPos.x, this.mCurPos.y, -v);
            }
            return super.prop(k, v);
        }

        /**
         * Set position of vertex
         * @param v Three.Vector3 position or x, y, z ordinates
         */
        setPosition(x, y, z) {
            if (typeof x === "object") {
                z = x.z;
                y = x.y;
                x = x.x;
            }
            this.mCurPos.set(x, y, z);
            if (this.object3D)
                this.object3D.position.set(x, y, z);
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
            if (this.object3D) {
                this.object3D.scale.x = this.handleScale;
                this.object3D.scale.y = this.handleScale;
                this.object3D.scale.z = this.handleScale;
            }
        }
        
        // @Override Visual
        addToScene(scene) {
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.mGeometry = new Three.SphereGeometry(1);
                this.setObject3D(new Three.Mesh(this.mGeometry, Materials.POINT));

                let v = this.mCurPos;
                this.object3D.position.set(v.x, v.y, v.z);
                this.object3D.scale.x = this.handleScale;
                this.object3D.scale.y = this.handleScale;
                this.object3D.scale.z = this.handleScale;
            }
            scene.add(this.object3D);
        }

        // @Override Visual
        remove() {
            this.removeFromScene();

            if (this.parent)
                this.parent.removeChild(this);
        }

        // @Override Visual
        projectRay(ray) {
            let np = new Three.Vector3();
            ray.closestPointToPoint(this.mCurPos, false, np);
            let dist2 = np.clone().sub(this.mCurPos).lengthSq();
            if (dist2 > 4)// * this.handleScale2)
                return null;
            return {
                closest: this,
                dist2: dist2,
                rayPt: np.clone()
            };
        }
        
        // @Override Visual
        highlight(on) {
            if (this.object3D) {
                this.object3D.material =
                (on ? Materials.POINT_SELECTED : Materials.POINT);
            }
        }

        // @Override Visual
        get scheme() {
            let s = super.scheme;
            let self = this;
            s.push({
                title: "X",
                type: "number",
                get: () => { return self.mCurPos.x; },
                set: (v) => {
                    self.setPosition(v, self.mCurPos.y, self.mCurPos.z);
                }
            });
            s.push({
                title: "Y",
                type: "number",
                get: () => { return self.mCurPos.y; },
                set: (v) => {
                    self.setPosition(self.mCurPos.x, v, self.mCurPos.z);
                }
            });
            s.push({
                title: "Z",
                type: "number",
                get: () => { return self.mCurPos.z; },
                set: (v) => {
                    self.setPosition(self.mCurPos.x, self.mCurPos.y, v);
                }
            });
            s.push({
                title: "Lat",
                type: "number",
                get: () => {
                    let ll = new UTM(this.mCurPos.x, this.mCurPos.y)
                        .toLatLong();
                    return ll.latitude;
                },
                set: (v) => {
                    let ll = new UTM(this.mCurPos.x, this.mCurPos.y)
                        .toLatLong();
                    let utm = UTM.fromLatLong(v, ll.longitude);
                    self.setPosition(
                        utm.easting, this.mCurPos.y, this.mCurPos.z);
                }
            });
            s.push({
                title: "Long",
                type: "number",
                get: () => {
                    let ll = new UTM(this.mCurPos.x, this.mCurPos.y)
                        .toLatLong();
                    return ll.longitude;
                },
                set: (v) => {
                    let ll = new UTM(this.mCurPos.x, this.mCurPos.y)
                        .toLatLong()
                    let utm = UTM.fromLatLong(ll.latitude, v);
                    self.setPosition(
                        this.mCurPos.x, utm.northing, this.mCurPos.z);
                }
            });
            
            return s;
        }

        // @Override Visual
        condense(coords, mapBack) {
            console.log("Condensed ", this.name);
            coords.push([this.position.x, this.position.y]);
            mapBack.push(this);
        }
    }
    return Point;
});

