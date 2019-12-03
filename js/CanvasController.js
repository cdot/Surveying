/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/CanvasController", ["js/Container", "three", "js/Selection", "js/Materials", "jquery"], function(Container, Three, Selection, Materials) {

    /**
     * Base class of canvas controllers. A canvas controller encapsulates
     * interactive controls and a camera.
     */
    class CanvasController {
        
        constructor($canvas, visual, scene, camera) {
           
            $canvas.data("controller", this);
            this.$mCanvas = $canvas;
            this.mVisual = visual;
            this.mCamera = camera;
            this.mScene = scene;

            scene.add(camera);
            
            this.mRenderer = new Three.WebGLRenderer();
            this.resize(
                $canvas.innerWidth(),
                $canvas.innerHeight());
            
            this.$mCanvas.append(this.mRenderer.domElement);
        }

        resize(w, h) {
            this.mAspectRatio = w / h;
            this.$mCanvas.find("canvas").height(h);
            this.$mCanvas.find("canvas").width(w);
            this.mRenderer.setSize(w, h);
            this.fit();
        }

        get scene() {
            return this.mScene;
        }
        
        /**
         * Set the Visual being displayed in this canvas
         */
        setVisual(visual) {
            this.mVisual = visual;
            this.fit();
        }
        
        fit() {
        }
        
        animate() {
            requestAnimationFrame(() => {
                this.animate();
            });
            this.mRenderer.render(this.mScene, this.mCamera);
        }
    }
    return CanvasController;
});
