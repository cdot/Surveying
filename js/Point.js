/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Point", ["js/Spot", "three", "js/Units", "js/Materials"], function(Spot, Three, Units, Materials) {

    /**
     * Virtual base class of points. The base class has no visual representation.
     * A point of interest, such as a buoy or depth sounding.
     * Hmm. A depth sounding is really a contour with only one point.
     */
    class Point extends Spot {

        // @Override Visual
        addToScene(scene) {
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.mGeometry = new Three.SphereGeometry(0.5);
                this.setObject3D(new Three.Mesh(this.mGeometry, Materials.POINT));

                let v = this.mPosition;
                this.object3D.position.set(v.x, v.y, v.z);
                this.object3D.scale.x = this.handleScale;
                this.object3D.scale.y = this.handleScale;
                this.object3D.scale.z = this.handleScale;
            }
            scene.add(this.object3D);
        }

        // @Override Visual
        highlight(on) {
            if (this.object3D) {
                this.object3D.material
                = (on ? Materials.POINT_SELECTED : Materials.POINT);
            }
        }

        // @Override Spot
        scheme() {
            let self = this;
            let s = super.scheme();
            s.push({
                title: "Lat",
                type: "number",
                get: () => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LONLAT);
                    return ll.lat;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LONLAT);
                    ll.lat = v;
                    let i = Units.convert(Units.LONLAT, ll, Units.IN);
                    i.z = self.mPosition.z;
                    self.setPosition(i);
                }
            });
            s.push({
                title: "Long",
                type: "number",
                get: () => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LONLAT);
                    return ll.lon;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LONLAT);
                    ll.lon = v;
                    let i = Units.convert(Units.LONLAT, ll, Units.IN);
                    i.z = self.mPosition.z;
                    self.setPosition(i);
                }
            });
            return s;
        }

        // @Override Visual
        condense(coords, mapBack) {
            // console.log("Condensed ", this.name);
            coords.push([this.position.x, this.position.y]);
            mapBack.push(this);
        }
    }
    return Point;
});

