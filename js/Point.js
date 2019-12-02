/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Point", ["js/Visual", "three", "js/Units", "js/Materials"], function(Visual, Three, Units, Materials) {

    /**
     * Base class of points. The default behaviour is a point sounding i.e
     * a point that stands on it's own as an object in a scene.
     */
    class Point extends Visual {
        /**
         * @param v {x, y, z} position of vertex
         * @param name vertex name (may not be unique)
         */
        constructor(p, name) {
            super(name);
            this.mCurPos = new Three.Vector3(p.x, p.y, p.z);
            // {Three.SphereGeometry} this.mGeometry
        }

        /**
         * Set position of vertex
         * @param v {x, y, z} position
         */
        setPosition(p) {
            this.mCurPos.set(p.x, p.y, p.z);
            if (this.object3D)
                this.object3D.position.set(p.x, p.y, p.z);
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
        scheme(skip) {
            let s = super.scheme(skip);
            let self = this;
            s.push({
                title: "X",
                type: "number",
                get: () => { return self.mCurPos.x; },
                set: (v) => {
                    self.setPosition({x: v, y: self.mCurPos.y, z: self.mCurPos.z});
                }
            });
            s.push({
                title: "Y",
                type: "number",
                get: () => { return self.mCurPos.y; },
                set: (v) => {
                    self.setPosition({x: self.mCurPos.x, y: v, z: self.mCurPos.z});
                }
            });
            if (!/'Z'/.test(skip)) {
                s.push({
                    title: "Z",
                    type: "number",
                    get: () => { return self.mCurPos.z; },
                    set: (v) => {
                        self.setPosition({x: self.mCurPos.x, y: self.mCurPos.y, z: v});
                    }
                });
            }
            s.push({
                title: "Lat",
                type: "number",
                get: () => {
                    let ll = Units.convert(
                        Units.IN, this.mCurPos.x, Units.LONLAT);
                    return ll.lat;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, this.mCurPos, Units.LONLAT);
                    ll.lat = v;
                    let i = Units.convert(Units.LONLAT, ll, Units.IN);
                    i.z = this.mCurPos.z;
                    self.setPosition(i);
                }
            });
            s.push({
                title: "Long",
                type: "number",
                get: () => {
                    let ll = Units.convert(
                        Units.IN, this.mCurPos.x, Units.LONLAT);
                    return ll.lon;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, this.mCurPos, Units.LONLAT);
                    ll.lon = v;
                    let i = Units.convert(Units.LONLAT, ll, Units.IN);
                    i.z = this.mCurPos.z;
                    self.setPosition(i);
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

