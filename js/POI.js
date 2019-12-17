/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/POI", ["js/Spot", "three", "js/Units", "js/Materials"], function(Spot, Three, Units, Materials) {

    /**
     * A marker for a point of interest, such as a buoy.
     */
    class POI extends Spot {

        // @Override Visual
        addToScene(scene) {
            super.addToScene(scene);
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.mGeometry = new Three.SphereGeometry(0.5);
                this.setObject3D(new Three.Mesh(this.mGeometry, Materials.POI));

                let v = this.mPosition;
                this.object3D.position.set(v.x, v.y, v.z);
                super.resizeHandles();
            }
            scene.add(this.object3D);
        }

        // @Override Visual
        highlight(on) {
            if (this.object3D) {
                this.object3D.material
                = (on ? Materials.POI_SELECTED : Materials.POI);
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
                        Units.IN, self.mPosition, Units.LATLON);
                    return ll.lat;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LATLON);
                    ll.lat = v;
                    let i = Units.convert(Units.LATLON, ll, Units.IN);
                    i.z = self.mPosition.z;
                    self.setPosition(i);
                }
            });
            s.push({
                title: "Long",
                type: "number",
                get: () => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LATLON);
                    return ll.lon;
                },
                set: (v) => {
                    let ll = Units.convert(
                        Units.IN, self.mPosition, Units.LATLON);
                    ll.lon = v;
                    let i = Units.convert(Units.LATLON, ll, Units.IN);
                    i.z = self.mPosition.z;
                    self.setPosition(i);
                }
            });
            return s;
        }
    }
    return POI;
});

