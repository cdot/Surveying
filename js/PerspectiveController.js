/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/PerspectiveController", ["js/CanvasController", "three", "js/OrbitControls"], function(CanvasController, Three, OrbitControls) {

    /**
     * Interactive orthographic projection
     */
    class PerspectiveController extends CanvasController {

        constructor($cb, controller) {
            super(
                $cb, controller,
                new Three.PerspectiveCamera(45, 1, 1, -1),
                false);
            this.mCamera.position.set(0, 0, 10);
            this.mCamera.up.set(0, 0, 1);
            this.mCamera.aspect = this.mAspectRatio;

            this.mControls = new OrbitControls(
                this.mCamera, this.mRenderer.domElement);
            this.mControls.target.set(0, 0, 0);
            this.mControls.update();

            this.mConstructed = true;
            this.animate();
        }
        
        // @Override CanvasController
        fit() {
            if (!this.mConstructed)
                return;
 
            let bounds = this.mSceneController.boundingBox;

            let sz = bounds.getSize(new Three.Vector3());
            let viewSize = Math.max(sz.x, sz.y, sz.z)

            this.mSceneController.resizeHandles(viewSize);

            // Look at the centre of the scene
            this.mControls.target = bounds.getCenter(new Three.Vector3());
            this.mCamera.position.set(bounds.max.x, bounds.max.y, bounds.max.z);
            this.mSceneController.resetRuler(this.mControls.target);
        }

        animate() {
            this.mControls.update();
            super.animate();
        }

    }
    return PerspectiveController;
});
