/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Sounding", ["js/Spot", "three", "js/Materials"], (Spot, Three, Materials) => {

    /**
     * A sounding is a single point that provides a position that can
     * be used in a point cloud
     */
    class Sounding extends Spot {

        // @Override Visual
        addToScene(scene) {
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.setObject3D(new Three.Sprite(Materials.SOUNDING));

                let v = this.mPosition;
                this.object3D.position.set(v.x, v.y, v.z);
                this.object3D.scale.x = 2 * this.handleScale;
                this.object3D.scale.y = 2 * this.handleScale;
                this.object3D.scale.z = 2 * this.handleScale;
            }
            scene.add(this.object3D);
        }
        
        // @Override Visual
        highlight(on) {
            if (this.object3D) {
                this.object3D.material
                = (on ? Materials.SOUNDING_SELECTED : Materials.SOUNDING);
            }
        }

        // @Override Visual
        condense(coords, mapBack) {
            // console.log("Condensed ", this.name);
            coords.push([this.position.x, this.position.y]);
            mapBack.push(this);
        }
    }

    return Sounding;
});
