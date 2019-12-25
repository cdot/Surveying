/* @copyright 2019 Crawford Currie - All rights reserved */
/* global requestAnimationFrame */
define("js/CanvasController", ["js/Container", "three", "jquery"], function(Container, Three) {

    /**
     * Base class of canvas controllers. A canvas controller encapsulates
     * interactive controls and a camera.
     */
    class CanvasController {
        
        constructor($canvasBox, controller, camera) {
            this.$mCanvasBox = $canvasBox;
            this.mSceneController = controller;
            
            this.mCamera = camera;

            controller.scene.add(camera);

            this.mRenderer = new Three.WebGLRenderer();
            this.resize();
            
            this.$mCanvasBox.append(this.mRenderer.domElement);
        }

	// Command handler, returns true if the command was handled
        onCmd(fn) {
            if (this[fn]) {
                this[fn].call(this);
		return true;
	    }
	    return false;
        }
            
        get isVisible() { return this.$mCanvasBox.is(":visible"); }
            
        hide() {
            return this.$mCanvasBox.hide();
        }
            
        show() {
            let self = this;
            this.mSceneController.setZoomGetter(() => {
                return self.mCamera.zoom;
            });
            return this.$mCanvasBox.show();
        }
            
        nextView() {
            $(document).trigger("nextView", this);
            return false;
        }

        registerEventHandlers(h) {
            let self = this;
            for (let event of h) {
                this.$mCanvasBox.on(event, function() {
                    let fn = `_handle_${event}`;
                    if (self[fn])
                        return self[fn].apply(self, arguments);
                });
            }
        }
        
        /**
         * Resize the canvas; called during construction and in
         * response to a window resize event
         */
        resize() {
            let w = this.$mCanvasBox.innerWidth();
            let h = this.$mCanvasBox.innerHeight();
            this.mAspectRatio = w / h;
            this.$mCanvasBox.find("canvas").height(h);
            this.$mCanvasBox.find("canvas").width(w);
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
                x: (x / this.$mCanvasBox.innerWidth() * 2 - 1),
                y: 1 - (y / this.$mCanvasBox.innerHeight()) * 2
            };
            let pos = new Three.Vector3(pt.x, pt.y, 0).unproject(this.mCamera);
            pos.z = this.mCamera.position.z;
            return new Three.Ray(pos, new Three.Vector3(0, 0, -1));
        }

        /**
         * Fit the scene
         */
        fit() { }

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
