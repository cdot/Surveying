/* @copyright 2019 Crawford Currie - All rights reserved */
/* global requestAnimationFrame */
define("js/CanvasController", ["js/Container", "three", "jquery"], function(Container, Three) {

    /**
     * Base class of canvas controllers. A canvas controller encapsulates
     * interactive controls and a camera.
     */
    class CanvasController {
        
        constructor(selector, controller, camera) {
            this.$mView = $(`#${selector}`);
            this.$mCanvas = $(`#${selector} > .canvas`);
            this.$mToolbar = $(`#${selector} > .toolbar`);
            this.$mMenubar = $(`#${selector} > .menubar`);

            this.$mCanvas.data("controller", this);
            this.$mToolbar.data("controller", this);

            this.mSceneController = controller;
            
            this.mCamera = camera;

            controller.scene.add(camera);

            this.mRenderer = new Three.WebGLRenderer();
            this.resize(
                this.$mCanvas.innerWidth(),
                this.$mCanvas.innerHeight());
            
            this.$mCanvas.append(this.mRenderer.domElement);

            let self = this;
            $(".menu", this.$mView)
            .on("menuselect", function (e, ui) {
                self.onCmd(ui.item.data("cmd"));
            });
            
            $("button", this.$mToolbar)
            .on("click", () => {
                self.onCmd($(this).data("cmd"));
            });
        }

        onCmd(fn) {
            if (this[fn])
                this[fn].call(this);
            else if (this.sceneController[fn])
                this.sceneController[fn].call(this.sceneController);
            else
                console.debug(`Missing command ${fn}`);
        }
            
        get sceneController() { return this.mSceneController; }
        
        get isVisible() { return this.$mView.is(":visible"); }
            
        hide() { return this.$mView.hide(); }
            
        show() { return this.$mView.show(); }
            
        nextView() { $(document).trigger("nextView", this); }
        
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
         * Convert an event on the canvas into
         * a 3D line projecting into the scene
         * @param e event
         * @return {Three.Line} ray
         */
        event2ray(e) {
            let x = e.pageX - $(e.target).offset().left; // e.clientX
            let y = e.pageY - $(e.target).offset().top; // e.clientY
            let pt = {
                x: (x / this.$mCanvas.innerWidth() * 2 - 1),
                y: 1 - (y / this.$mCanvas.innerHeight()) * 2
            };
            let pos = new Three.Vector3(pt.x, pt.y, 0).unproject(this.mCamera);
            this.sceneController.cursor = pos;
            pos.z = this.mCamera.position.z;
            return new Three.Ray(pos, new Three.Vector3(0, 0, -1));
        }

        /**
         * Fit the scene
         */
        fit() { }

        upload() { $("#upload_dialog").dialog("open"); }
        
        download() { $("#download_dialog").dialog("open"); }

        /**
         * Animation loop
         */
        animate() {
            requestAnimationFrame(() => {
                this.animate();
            });
            this.mRenderer.render(this.mSceneController.scene, this.mCamera);
        }
    }
    return CanvasController;
});
