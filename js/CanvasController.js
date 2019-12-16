/* @copyright 2019 Crawford Currie - All rights reserved */
/* global requestAnimationFrame */
define("js/CanvasController", ["js/Container", "three", "jquery"], function(Container, Three) {

    /**
     * Base class of canvas controllers. A canvas controller encapsulates
     * interactive controls and a camera.
     */
    class CanvasController {
        
        constructor(selector, visual, scene, camera) {
            this.$mView = $(`#${selector}`);
            this.$mCanvas = $(`#${selector} > .canvas`);
            this.$mToolbar = $(`#${selector} > .toolbar`);

            this.$mCanvas.data("controller", this);
            this.$mToolbar.data("controller", this);

            this.mVisual = visual;
            this.mCamera = camera;
            this.mScene = scene;

            scene.add(camera);
            
            this.mRenderer = new Three.WebGLRenderer();
            this.resize(
                this.$mCanvas.innerWidth(),
                this.$mCanvas.innerHeight());
            
            this.$mCanvas.append(this.mRenderer.domElement);
        }

        toggle() {
            this.$mView.toggle();
        }
        
        /**
         * Resize the canvas; called during construction and in
         * response to a window resize event
         */
        resize(w, h) {
            this.mAspectRatio = w / h;
            this.$mCanvas.find("canvas").height(h);
            this.$mCanvas.find("canvas").width(w);
            this.mRenderer.setSize(w, h);
            this.fit();
        }

        /**
         * Get the Three.Scene generated from the visual in this canvas
         * @return {Three.Scene} the scene
         */
        get scene() {
            return this.mScene;
        }

        /**
         * Get the Visual being displayed in this canvas
         * @return {VBisual} the root visual
         */
        get visual() {
            return this.mVisual;
        }

        /**
         * Set the Visual being displayed in this canvas
         * @param {Visual} the new visual
         */
        setVisual(visual) {
            this.mVisual = visual;
            this.fit();
        }

        /**
         * Fit the scene
         * @abstract
         */
        fit() {
        }

        /**
         * Animation loop
         */
        animate() {
            requestAnimationFrame(() => {
                this.animate();
            });
            this.mRenderer.render(this.mScene, this.mCamera);
        }
    }
    return CanvasController;
});
