/* @preserve Copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */
define("js/OrthographicController", ["js/CanvasController", "three", , "js/Units", "js/UTM", "jquery"], function(CanvasController, Three, Units, UTM) {

    /**
     * Interactive orthographic projection
     */
    class OrthographicController extends CanvasController {

        constructor($cb, controller) {
            // Default 1km/1km scene
            super(
                $cb, controller,
                new Three.OrthographicCamera(-500, 500, 500, -500),
                true);
            
            // Set up the camera
            // Centre of the viewing frustum - will be set when
            // we refocus()
            this.mLookAt = new Three.Vector3(
                (UTM.MIN_EASTING + UTM.MAX_EASTING) / 2,
                (UTM.MIN_NORTHING + UTM.MAX_NORTHING) / 2,
                0);

            this.mSceneController.rulerStart = this.mLookAt;

            this.mCamera.position.set(this.mLookAt.x, this.mLookAt.y, 10);
            
            // Connect event handlers
            this.mMouseDownPt = null; // button flags
            this.mIsDragging = false;
            this.mLastRayPt = null;

            this.registerEventHandlers([
                "keydown", "mousenter", "mouseleave",
                "mousedown", "mouseup", "mousewheel", "mousemove"
            ]);

            this.mConstructed = true;
            this.animate();
        }

        panBy(delta) {
            this.mLookAt.x += delta.x;
            this.mLookAt.y += delta.y;
            this.mCamera.position.set(
                this.mLookAt.x, this.mLookAt.y, this.mCamera.position.z);
            this.mCamera.lookAt(this.mLookAt);
            this.mCamera.updateProjectionMatrix();
        }

        zoom(factor) {
            this.mCamera.zoom *= factor;
            this.mSceneController.resizeCursor(factor);
            this.mSceneController.resizeHandles();
            this.mCamera.updateProjectionMatrix();
        }

        // @Override CanvasController
        fit() {
            if (!this.mConstructed)
                return;
            
            // Reposition the cameras so they are looking down on the
            // entire scene
            let bounds = this.mSceneController.boundingBox;

            // Look at the centre of the scene
            bounds.getCenter(this.mLookAt);
            
            let sz = bounds.getSize(new Three.Vector3());
            let viewSize = Math.max(sz.x, sz.y)

            this.mSceneController.resizeHandles(viewSize);

            let c = this.mCamera;
            c.zoom = 1;
            c.left = -this.mAspectRatio * viewSize / 2;
            c.right = this.mAspectRatio * viewSize / 2;
            c.top = viewSize / 2;
            c.bottom = -viewSize / 2;
            c.near = 0.1;
            c.far = 2 * viewSize;
            c.up = new Three.Vector3(0, 1, 0);
            c.position.set(this.mLookAt.x, this.mLookAt.y, viewSize);
            c.lookAt(this.mLookAt);
            c.updateProjectionMatrix();

            // Ruler/cursor
            this.mSceneController.resetRuler(this.mLookAt);
        }

        _handle_keydown(e) {
            // Keys on mobile are going to need buttons or menu items
            switch (e.key) {
            case "v":
                // Split selected edges and add a new vertex
                this.onCmd("splitEdges");
                return false;
                
            case ".":
                this.onCmd("addPOI");
                return false;

            case "s":
                this.onCmd("addSounding");
                return false;

            case "c":
                this.onCmd("addContour");
                return false;
                
            case "p":
                this.onCmd("addPath");
                return false;
                
            case "-":
                this.zoom(0.8);
                return false;

            case "=":
                this.zoom(1.2);
                return false;

            case "m": // m, set measure point
                this.mSceneController.resetRuler();
                return false;

            default:
                // Drop through OK
            }
            
            switch (e.keyCode) {
                
            case 37: // left, prev sibling
                return this.onCmd("selPrev");
                
            case 38: // up, move up in selection
                return this.onCmd("selParent");

            case 39: // right
                return this.onCmd("selNext");

            case 40: // down, select first child
                return this.onCmd("selFirstChild");

            case 46: // delete selected items
                return this.onCmd("selDelete");
                
            default:
                return true;
            }
        }
    
        _handle_mouseenter() {
            this.$mCanvas.focus();
            this.mMouseDownPt = false;
            this.mIsDragging = false;
            return true;
        }

        _handle_mouseleave() {
            this.mMouseDownPt = false;
            this.mIsDragging = false;
            return true;
        }

        _handle_mousedown(e) {
            this.mMouseDownPt = { x: e.offsetX, y: e.offsetY };
            let ray = this.event2ray(e);
            this.mLastRayPt = ray.origin.clone();
            if (!this.mSceneController.selection.isEmpty) {
                let hit = this.mSceneController.projectRay(ray);
                if (hit && this.mSceneController.selection.contains(hit.closest))
                    this.mIsDragging = true;
            }
            return true; // Get focus behaviour
        }

        _handle_mouseup(e) {
            let ray = this.event2ray(event);
            if (this.mMouseDownPt && !this.mIsDragging) {
                if (e.offsetX === this.mMouseDownPt.x
                    && e.offsetY === this.mMouseDownPt.y) {
                    if (!e.shiftKey)
                        this.mSceneController.selection.clear();
                    let hit = this.mSceneController.projectRay(ray);
                    if (hit) {
                        this.mSceneController.selection.add(hit.closest);
                        if (hit.closest2)
                            this.mSceneController.selection.add(hit.closest2);
                    } else
                        this.mSceneController.selection.clear();
                } else
                    this.mSceneController.selection.clear();
            }
            this.mMouseDownPt = null;
            this.mIsDragging = false;
            return true;
        }

        _handle_mousemove(e) {
            let ray = this.event2ray(e);
            if (this.mMouseDownPt && ray) {
                let p = ray.origin;
                let delta = p.clone().sub(this.mLastRayPt);
                if (this.mIsDragging) {
                    let mat = new Three.Matrix4().makeTranslation(
                        delta.x, delta.y, 0);
                    this.mSceneController.selection.applyTransform(mat);
                } else
                    this.panBy(delta.negate());
                this.mLastRayPt = p;
            }
            return true;
        }

        // Zoom in/out
        _handle_mousewheel(event) {
            event.stopPropagation();

            if (event.deltaY < 0)
                this.zoom(0.8);
            else
                this.zoom(1.2);
            
            return false; // Suppress scrolling
        }
    }
    return OrthographicController;
});
