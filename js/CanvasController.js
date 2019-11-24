/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/CanvasController", ["js/Container", "three", "js/Selection", "js/UTM", "js/Materials", "jquery"], function(Container, Three, Selection, UTM, Materials) {

    /**
     * Base class of canvas controllers. A canvas controller encapsulates
     * interactive controls and a camera.
     */
    class CanvasController {
        constructor(selector, scene, camera) {
            // connect the canvas
            let $canvas = $(selector);
           
            $canvas.data("controller", this);
            this.$mCanvas = $canvas;

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
