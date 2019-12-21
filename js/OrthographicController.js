/* @preserve Copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */
define("js/OrthographicController", ["js/CanvasController", "three", "js/Units", "js/UTM", "js/Materials", "jquery"], function(CanvasController, Three, Units, UTM, Materials) {

    const State = {
        NONE: 0,
        DRAGGING: 1,
        MEASURING: 2
    };
    
    /**
     * Interactive orthographic projection
     */
    class OrthographicController extends CanvasController {

        constructor($cb, controller) {
            // Default 1km/1km scene
            super(
                $cb, controller,
                new Three.OrthographicCamera(-500, 500, 500, -500));
            
            // Set up the camera
            // Centre of the viewing frustum - will be set when
            // we refocus()
            this.mLookAt = new Three.Vector3(
                (UTM.MIN_EASTING + UTM.MAX_EASTING) / 2,
                (UTM.MIN_NORTHING + UTM.MAX_NORTHING) / 2,
                0);

            // Set up cursor
            this.mCursorSprite = new Three.Sprite(Materials.CURSOR);
            this.mCursorSprite.position.copy(this.mLookAt);
 
            this.mRulerGeom = new Three.Geometry();
            this.mRulerGeom.vertices.push(
                // Make sure it's initially different to the cursor pos!
                this.mLookAt.clone().addScalar(-Units.UPM[Units.IN]),
                this.cursor);

            this.mRulerLine = new Three.Line(this.mRulerGeom, Materials.RULER);
            this.mRulerEnabled = false;

            this.mCamera.position.set(this.mLookAt.x, this.mLookAt.y, 10);
            
            // Connect event handlers
            this.mMouseDownPt = null; // button flags
            this.mState = State.NONE;
            this.mLastRayPt = null;

            this.registerEventHandlers([
                "keydown", "mousenter", "mouseleave",
                "mousedown", "mouseup", "mousewheel", "mousemove"
            ]);

            let self = this;
            $(document).on("cursorchanged", function() {
                $(".cursor_wgs").html(self.cursorWGS);
                if (self.mRulerEnabled) {
                    self.mRulerGeom.verticesNeedUpdate = true;
                    $(".ruler .length").text(self.rulerLength);
                    $(".ruler .bearing").text(self.rulerBearing);
                    $(".ruler").show();
                } else {
                    $(".ruler").hide();
                }
            });

            this.mConstructed = true;
            this.animate();
        }

        // @Override CanvasController
        show() {
            super.show();
            this.showCursor();
        }
        
        // @Override CanvasController
        hide() {
            super.hide();
            this.disableRuler();
            this.hideCursor();
        }

        /**
         * Add the ruler to the scene
         */
        showRuler() {
            if (!this.mRulerEnabled)
                this.mSceneController.scene.add(this.mRulerLine);
            this.mRulerEnabled = true;
        }
        
        /**
         * Remove the ruler from the scene
         */
        disableRuler() {
            if (this.mRulerEnabled)
                this.mSceneController.scene.remove(this.mRulerLine);
            this.mRulerEnabled = false;
        }
        
        /**
         * Get the scene cursor position, shared between all views
         */
        get cursor() {
            return this.mCursorSprite.position;
        }

        /**
         * Get WGS coords for the cursor as a string
         */
        get cursorWGS() {
            try {
                return Units.stringify(Units.IN, this.cursor, Units.LATLON);
            } catch (e) {
                //console.debug(e);
                return "Unknown";
            }
        }

        /**
         * Set the scene cursor
         */
        set cursor(v) {
            this.cursor.set(v.x, v.y, 0);
            $(document).trigger("cursorchanged");
        }

        /**
         * Enable/disable the cursor
         */
        showCursor() {
            this.mSceneController.scene.add(this.mCursorSprite);
        }

        hideCursor() {
            this.mSceneController.scene.remove(this.mCursorSprite);
        }

        /**
         * Get the start position of the ruler
         */
        get rulerStart() {
            return this.mRulerGeom.vertices[0];
        }

        /**
         * Set the start position of the ruler
         */
        set rulerStart(v) {
            this.mRulerGeom.vertices[0].copy(v);
            this.mRulerGeom.verticesNeedUpdate = true;
            
            $(document).trigger("cursorchanged");
        }

        /**
         * Measure the planar distance between the start of the ruler
         * and the cursor
         */
        get rulerLength() {
            let dx = this.mRulerGeom.vertices[1].x - this.rulerStart.x;
            let dy = this.mRulerGeom.vertices[1].y - this.rulerStart.y;
            let dist = Math.sqrt(dx * dx + dy * dy) / Units.UPM[Units.IN];
            return dist.toFixed(2);
        }

        /**
         * Get the compass bearing between the start of the ruler and
         * the cursor
         */
        get rulerBearing() {
            let dx = this.mRulerGeom.vertices[1].x - this.rulerStart.x;
            let dy = this.mRulerGeom.vertices[1].y - this.rulerStart.y;
            if (dy === 0)
                return dx < 0 ? 270 : 90;
            let quad = (dx > 0) ? ((dy > 0) ? 0 : 180) : ((dy > 0) ? 360 : 180);
            return Math.round(quad + 180 * Math.atan(dx / dy) / Math.PI);
        }

        panBy(delta) {
            this.mLookAt.x += delta.x;
            this.mLookAt.y += delta.y;
            this.mCamera.position.set(
                this.mLookAt.x, this.mLookAt.y, this.mCamera.position.z);
            this.mCamera.lookAt(this.mLooAt);
            this.mCamera.updateProjectionMatrix();
        }

        zoom(factor) {
            this.mCamera.zoom *= factor;
            this.mCursorSprite.scale.x /= factor;
            this.mCursorSprite.scale.y /= factor;
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

            this.mCursorSprite.scale.x = this.mCursorSprite.scale.y
            = viewSize / 30;
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

            case "m": // enable ruler
                this.rulerStart = this.cursor;
                this.showRuler();
                this.mState = State.MEASURING;
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
            return true;
        }

        _handle_mouseleave() {
            this.mMouseDownPt = false;
            if (this.mState === State.DRAGGING)
                this.mState = State.NONE;
            return true;
        }

        _handle_mousedown(e) {
            if (this.mState === State.MEASURING) {
                this.disableRuler();
                return true;
            }
            this.mMouseDownPt = { x: e.offsetX, y: e.offsetY };
            let ray = this.event2ray(e);
            this.cursor = ray.origin;
            this.mLastRayPt = ray.origin.clone();
            if (!this.mSceneController.selection.isEmpty) {
                let hit = this.mSceneController.projectRay(ray);
                if (hit && this.mSceneController.selection.contains(hit.closest))
                    this.mState = State.DRAGGING;
            }
            return true; // Get focus behaviour
        }

        _handle_mouseup(e) {
            let ray = this.event2ray(event);
            this.cursor = ray.origin;
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
            this.mState = State.NONE;
            return true;
        }

        _handle_mousemove(e) {
            let ray = this.event2ray(e);
            this.cursor = ray.origin;
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
