define("js/OrthographicController", ["js/CanvasController", "three", "js/Selection", "js/Point", "js/Contour", "js/Units", "js/UTM", "js/Materials", "jquery"], function(CanvasController, Three, Selection, Point, Contour, Units, UTM, Materials) {

    /**
     * Interactive orthographic projection
     */
    class OrthographicController extends CanvasController {

        constructor($canvas, visual, scene) {
            // Default 1km/1km scene
            super($canvas, visual, scene,
                 new Three.OrthographicCamera(-500, 500, 500, -500));
            
            // Set up the camera
            // Centre of the viewing frustum - will be set when
            // we refocus()
            this.mLookAt = new Three.Vector3(
                (UTM.MIN_EASTING + UTM.MAX_EASTING) / 2,
                (UTM.MIN_NORTHING + UTM.MAX_NORTHING) / 2,
                0);

            // Set up ruler geometry
            this.mRulerGeom = new Three.Geometry();
            // Start of measure line
            this.mRulerStart = this.mLookAt.clone();
            this.mRulerGeom.vertices.push(this.mRulerStart);
            // End of measure line under the cursor
            this.mCursor = this.mLookAt.clone();
            this.mRulerGeom.vertices.push(this.mCursor);
            let rulerLine = new Three.Line(this.mRulerGeom, Materials.RULER);
            scene.add(rulerLine);

            this.mCamera.position.set(this.mLookAt.x, this.mLookAt.y, 10);
            
            // Size of a handle in world coordinates
            this.mHandleSize = 1;
            
            $("#noform").on("submit", () => false);

            function makeControl(scheme) {
                if (scheme instanceof Array)
                    return makeControls(scheme);

                if (scheme.type === "ignore")
                    return undefined;
                
                let $li = $("<li></li>");
                if (typeof scheme === "string") {
                    $li.text(scheme);
                    return $li;
                }
                $li.append(scheme.title + " ");
                if (scheme.type !== "label") {
                    let $in = $('<input class="property"/>');
                    $in.attr("type", scheme.type);
                    $in.attr("value", scheme.get());
                    $in.on("change", function() {
                        let v = $(this).val();
                        if (scheme.type === "number")
                            v = parseFloat(v);
                        scheme.set(v);
                    });
                    $li.append($in);
                }
                return $li;
            }
            
            function makeControls(schemes) {
                if (schemes.length === 0)
                    return null;
                let $block = $("<ul></ul>");
                for (let scheme of schemes) {
                    let c = makeControl(scheme);
                    if (c)
                        $block.append(c);
                }
                return $block;
            }
            
            // Set up the selection manager
            this.mSelection = new Selection(sln => {
                let $report = $("<ul></ul>");
                for (let sel of sln.items) {
                    if (sln.setHandleScale)
                        sln.setHandleScale(this.mHandleSize / this.mCamera.zoom);
                    let $s = makeControls(sel.scheme(""));
                    if ($s)
                        $report.append($s);
                }
                $("#report").empty().append($report);
            });

            // Connect event handlers
            this.mMouseDownPt = null; // button flags
            this.mIsDragging = false;
            this.mLastCanvasPt = null;
            this.mLastRayPt = null;
            let self = this;
            for (let event of [ "keydown", "mousenter", "mouseleave",
                                "mousedown", "mouseup", "mousewheel",
                                "mousemove" ]) {
                this.$mCanvas.on(event, function() {
                    return self["_handle_" + event].apply(self, arguments);
                });
            }

            this.mConstructed = true;
        }

        /**
         * Convert an event on the canvas into
         * a 3D line projecting into the scene
         * @param e event
         * @return {Three.Line} ray
         */
        event2ray(e) {
            let pt = {
                x: (e.clientX / this.$mCanvas.innerWidth() * 2 - 1),
                y: 1 - (e.clientY / this.$mCanvas.innerHeight()) * 2
            };
	    let pos = new Three.Vector3(pt.x, pt.y, 0).unproject(this.mCamera);
            pos.z = 1000;
            this.mCursor.x = pos.x;
            this.mCursor.y = pos.y;
            this.mRulerGeom.verticesNeedUpdate = true;
            $(document).trigger("cursorchanged");
            let tgt = pos.clone();
            tgt.z = -1000;
            return new Three.Line3(pos, tgt);
        }

        panBy(delta) {
            this.mLookAt.x += delta.x;
            this.mLookAt.y += delta.y;
            this.mCamera.position.set(
                this.mLookAt.x, this.mLookAt.y, this.mCamera.position.z);
            this.mCamera.lookAt(this.mLookAt);
            this.mCamera.updateProjectionMatrix();
        }

        get cursor() {
            return this.mCursor;
        }

        /**
         * Set the start of the ruler to be the cursor point
         */
        measureFrom() {
            this.mRulerStart.copy(this.mCursor);
            this.mRulerGeom.verticesNeedUpdate = true;
            $(document).trigger("cursorchanged");
            //console.log("measure", this.mRulerGeom.vertices);
        }

        /**
         * Measure the planar distance between the start of the ruler
         * and the cursor
         */
        get rulerLength() {
            // UTM units are metres, so convert via
            let a = Units.convert(Units.IN, this.mRulerStart, Units.UTM);
            let b = Units.convert(Units.IN, this.mCursor, Units.UTM);
            let dx = a.east - b.east;
            let dy = a.north - b.north;
            return Math.round(100 * Math.sqrt(dx * dx + dy * dy)) / 100;
        }

        /**
         * Get the compass bearing between the start of the ruler and
         * the cursor
         */
        get rulerBearing() {
            let dx = this.mCursor.x - this.mRulerStart.x;
            let dy = this.mCursor.y - this.mRulerStart.y;
            if (dy === 0)
                return dx < 0 ? 270 : 90;
            let quad = (dx > 0) ? ((dy > 0) ? 0 : 180) : ((dy > 0) ? 360 : 180);
            return Math.round(quad + 180 * Math.atan(dx / dy) / Math.PI);
        }

        _splitSelectedEdges() {
            let sel = this.mSelection.items;
            // Split edges where both end points are in the selection
            let split = [];
            for (let i = 0; i < sel.length; i++) {
                let s = sel.items[i];
                if (s instanceof Point) {
                    for (let j = i + 1; j < sel.length; j++) {
                        let ss = sel.items[j];
                        if (ss !== s
                            && ss.parent === s.parent
                            && s.parent.hasEdge(s, ss))
                            split.push({ p: ss.parent, a: s, b: ss });
                    }
                }
            }
            for (let e of split) {
                let v = e.p.splitEdge(e.a, e.b);
                if (v)
                    this.mSelection.add(v);
            }
        }
        
        zoom(factor) {
            this.mCamera.zoom *= factor;
            this.mVisual.setHandleScale(this.mHandleSize / this.mCamera.zoom);
            this.mCamera.updateProjectionMatrix();
       }

        // @Override CanvasController
        fit() {
            if (!this.mConstructed)
                return;
            
            // Reposition the cameras so they are looking down on the
            // entire scene
            let bounds = this.mVisual.boundingBox;

            if (bounds.isEmpty() && !this.parent) {
                // Deal with an empty visual
                // A roughly 1nm square block of sea in the English Channel
                let ll = Units.convert(Units.LONLAT,
                                       { lon: -0.5, lat: 50 },
                                       Units.IN);

                ll.z = -10;

                let ur = Units.convert(Units.LONLAT,
                                       { lon: -0.483, lat: 50.017 },
                                       Units.IN);
                ur.z = 10;
                
                bounds = new Three.Box3(ll, ll);
                bounds.expandByPoint(ur);
            }

            // Look at the centre of the scene
            bounds.getCenter(this.mLookAt);

            let sz = bounds.getSize(new Three.Vector3());
            let viewSize = Math.max(sz.x, sz.y)

            // Scale handles appropriately so they appear as
            // a fraction of the canvas width
            this.mHandleSize = viewSize / 100;
            this.mVisual.setHandleScale(this.mHandleSize);

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
            this.mRulerStart.copy(this.mLookAt);
            this.mCursor.copy(this.mLookAt);
            this.mRulerGeom.verticesNeedUpdate = true;
        }

        // Canvas event handlers - private
        
        _handle_keydown(e) {
            // Keys on mobile are going to need buttons or menu items
            let sel;

            switch (e.key) {
            case "v":
                this._splitSelectedEdges();
                this.mSelection.setHandleScale(this.mHandleSize / this.mCamera.zoom);
                return false;
                
            case "p":
                // Add a new point under the cursor
                let pt = new Point(this.mCursor, "New point");
                this.mVisual.addChild(pt);
                pt.addToScene(this.scene);
                this.mSelection.add(pt);
                this.mSelection.setHandleScale(
                    this.mHandleSize / this.mCamera.zoom);
                return false;

            case "c":
                // Add a new contour, three points centred on the cursor, 1m radius
                let c = new Contour("New point");
                c.addVertex({ x: this.mCursor.x, y: this.mCursor.y + 1});
                c.addVertex({ x: this.mCursor.x + 0.866,
                              y: this.mCursor.y - 0.5 });
                c.addVertex({ x: this.mCursor.x - 0.866,
                              y: this.mCursor.y - 0.5 });
                c.close();
                this.mVisual.addChild(c);
                c.addToScene(this.scene);
                this.mSelection.add(c);
                this.mSelection.setHandleScale(
                    this.mHandleSize / this.mCamera.zoom);
                return false;

            case "-":
                this.zoom(0.8);
                return false;

            case "=":
                this.zoom(1.2);
                return false;
            }
            
            switch (e.keyCode) {
                
            case 37: // left, prev sibling
                sel = this.mSelection.items.slice();
                for (let s of sel) {
                    if (s.prev) {
                        this.mSelection.remove(s);
                        this.mSelection.add(s.prev);
                    }
                }
                return false;
                
            case 38: // up, move up in selection
                sel = this.mSelection.items.slice();
                for (let s of sel) {
                    if (s.parent !== this.mVisual) {
                        this.mSelection.remove(s);
                        this.mSelection.add(s.parent);
                    }
                }
                return false;

            case 39: // right
                sel = this.mSelection.items.slice();
                for (let s of sel) {
                    if (s.next) {
                        this.mSelection.remove(s);
                        this.mSelection.add(s.next);
                    }
                }
                return false;

            case 40: // down, select first child
                sel = this.mSelection.items.slice();
                for (let s of sel) {
                    if (s.children && s.children.length > 0) {
                        this.mSelection.remove(s);
                        this.mSelection.add(s.children[0]);
                    }
                }
                return false;

            case 43: // +, split selected edges
                return false;
                
            case 46: // delete selection
                for (sel of this.mSelection.items)
                    // Remove the item completely
                    sel.remove();
                this.mSelection.clear();
                return false;
                    
            case 77: // m, set measure point
                this.measureFrom();
                return false;
            }
            
            return true;
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
            this.mMouseDownPt = {x: e.offsetX, y: e.offsetY};
            let ray = this.event2ray(e);
            this.mLastRayPt = ray.start.clone();
            this.mLastCanvasPt = {x: e.offsetX, y: e.offsetY};
            if (this.mSelection.size > 0) {
                let hit = this.mVisual.projectRay(ray);
                // TODO: is hit close enough in display space?
                if (hit && this.mSelection.contains(hit.closest))
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
                        this.mSelection.clear();
                    let proj = this.mVisual.projectRay(ray);
                    if (proj)
                        this.mSelection.add(proj.closest);
                    else
                        this.mSelection.clear();
                } else
                    this.mSelection.clear();
            }
            this.mMouseDownPt = null;
            this.mIsDragging = false;
            return true;
        }

        _handle_mousemove(e) {
            let ray = this.event2ray(e);
            if (this.mMouseDownPt && ray) {
                let p = ray.start;
                let delta = p.clone().sub(this.mLastRayPt);
                /*(console.log("can", this.mLastCanvasPt.x,",",this.mLastCanvasPt.y);
                console.log("ray", p.x,",",p.y);
                console.log("del", delta.x,",",delta.y);*/
                if (this.mIsDragging) {
                    let mat = new Three.Matrix4().makeTranslation(
                        delta.x, delta.y, 0);
                    this.mSelection.applyTransform(mat);
                } else
                    this.panBy(delta.negate());
                this.mLastRayPt = p;
                this.mLastCanvasPt = {x: e.offsetX, y: e.offsetY};
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
