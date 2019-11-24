define("js/PerspectiveController", ["js/CanvasController", "three", "js/OrbitControls"], function(CanvasController, Three, OrbitControls) {

    /**
     * Interactive orthographic projection
     */
    class PerspectiveController extends CanvasController {

        constructor(selector, scene) {
            super(selector, scene,
                  new Three.PerspectiveCamera(45, 1, 1, -1));  
            this.mCamera.position.set(0, 0, 10);           
            this.mCamera.up.set(0, 0, 1);
            this.mCamera.aspect = this.mAspectRatio;

            this.mControls = new OrbitControls(
                this.mCamera, this.mRenderer.domElement);
            this.mControls.target.set(0, 0, 0);
            this.mControls.update();
        }

        // @Override CanvasController
        fit() {
            if (!this.mVisual)
                return;
            let bounds = this.mVisual.boundingBox;

            // Look at the centre of the scene
            this.mControls.target = bounds.getCenter(new Three.Vector3());
            this.mCamera.position.set(bounds.max.x, bounds.max.y, 10);
        }

        animate() {
            this.mControls.update();
            super.animate();
        }
    }
    return PerspectiveController;
});
