/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Spot", ["js/Visual", "three"], function(Visual, Three) {

    /**
     * Virtual base class of points. The base class has no visual representation.
     * A point of interest, such as a buoy or depth sounding.
     * Hmm. A depth sounding is really a contour with only one point.
     */
    class Spot extends Visual {
        
        /**
         * @param v {x, y, z} position of vertex
         * @param name vertex name (may not be unique)
         */
        constructor(p, name) {
            super(name);
            this.mPosition = new Three.Vector3(p.x, p.y, p.z);
            // {Three.SphereGeometry} this.mGeometry
        }

        /**
         * Set position of vertex
         * @param v {x, y, z} position
         */
        setPosition(p) {
            this.mPosition.set(p.x, p.y, p.z);
            if (this.object3D)
                this.object3D.position.set(p.x, p.y, p.z);
        }

        /**
         * @return Three.Vector3 position of vertex
         */
        get position() {
            return this.mPosition;
        }
        
        // @Override Visual
        get boundingBox() {
            return new Three.Box3(this.mPosition, this.mPosition);
        }

        // @Override Visual
        applyTransform(mat) {
            let p = this.mPosition.clone();
            p.applyMatrix4(mat);
            this.setPosition(p);
        }

        // @Override Visual
        remove() {
            this.removeFromScene();

            if (this.parent)
                this.parent.removeChild(this);
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
        projectRay(ray, range2) {
            let np = new Three.Vector3();
            ray.closestPointToPoint(this.mPosition, np);
            let dist2 = np
                .clone()
                .sub(this.mPosition)
                .lengthSq();
            // Hit within a metre
            if (dist2 > range2)
                return null;
            return {
                closest: this,
                dist2: dist2,
                rayPt: np
            };
        }
        
        // @Override Visual
        scheme() {
            let self = this;
            let s = super.scheme();
            s.push({
                title: "X",
                type: "number",
                get: () => self.mPosition.x,
                set: (v) => {
                    self.setPosition({
                        x: v, y: self.mPosition.y, z: self.mPosition.z
                    });
                }
            });
            s.push({
                title: "Y",
                type: "number",
                get: () => self.mPosition.y,
                set: (v) => {
                    self.setPosition({
                        x: self.mPosition.x, y: v, z: self.mPosition.z
                    });
                }
            });
            s.push({
                title: "Z",
                type: "number",
                get: () => self.mPosition.z,
                set: (v) => {
                    self.setPosition({
                        x: self.mPosition.x, y: self.mPosition.y, z: v
                    });
                }
            });
            return s;
        }
    }
    return Spot;
});

