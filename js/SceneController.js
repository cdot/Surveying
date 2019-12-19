/* @preserve Copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */
define("js/SceneController", ["three", "js/Selection", "js/Container", "js/POI", "js/Path", "js/Contour", "js/Sounding", "js/Spot", "js/Units", "js/UTM", "js/Materials", "jquery"], function(Three, Selection, Container, POI, Path, Contour, Sounding, Spot, Units, UTM, Materials) {

     // Given a schema, make the HTML controls that support editing of that schema
    function makeControls(schemes) {

        function makeControl(scheme) {
            if (scheme instanceof Array)
                return this._makeControls(scheme);
            
            if (scheme.type === "ignore")
                return null;
            
            let $li = $("<li></li>");
            if (typeof scheme === "string") {
                $li.text(scheme);
                return $li;
            }
            $li.append(`${scheme.title} `);
            if (scheme.type !== "label") {
                let $in = $("<input class='property'/>");
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

    class SceneController {
        constructor() {
            this.mVisual = new Container("root");
            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xF0F0F0);
            this.mScene.userData.controller = this;
 
            // Size of a handle in world coordinates = 50cm
            this.mHandleSize = Units.UPM[Units.IN] / 2;

            // Set up cursor and ruler geometry.
            this.mCursorSprite = new Three.Sprite(Materials.CURSOR);
            this.mCursorSprite.position.set(3, 3, 3);
            this.mRulerGeom = new Three.Geometry();

            this.mRulerGeom.vertices.push(
                new Three.Vector3(1, 1, 1),
                this.mCursorSprite.position);
            this.mRulerLine = new Three.Line(this.mRulerGeom, Materials.RULER);

            let self = this;
            // Set up the selection manager
            this.mSelection = new Selection((sln) => {
                let $report = $("<ul></ul>");
                for (let sel of sln.items) {
                    if (sln.resizeHandles)
                        sln.resizeHandles();
                    let $s = makeControls(sel.scheme(""));
                    if ($s)
                        $report.append($s);
                }
                $(".information")
                .empty()
                .append($report);
            });
            
            this._bindDialogHandlers();
        }
        
        _bindDialogHandlers() {
            let self = this;
            
            $("#upload_dialog .upload_input").on("change", function(evt) {
                let f = evt.target.files[0];
                let fn = f.name;
                let type = fn.replace(/^.*\./u, "").toLowerCase();
                $("#upload_dialog").dialog("close");
                requirejs(
                    [`js/FileFormats/${type}`],
                    (Loader) => {
                        let reader = new FileReader();

                        reader.onload = (e) => {
                            let data = e.target.result;
                            new Loader().load(fn, data)
                            .then((result) => {
                                self.mVisual.addChild(result);
                                result.addToScene(self.mScene);
                                let bb = self.mVisual.boundingBox;
                                let min = Units.stringify(Units.IN, bb.min, Units.LATLON);
                                let max = Units.stringify(Units.IN, bb.max, Units.LATLON);
                                console.log(`Loaded ${fn}, ${min} -> ${max}`);
                                $(document).trigger("fitViews");
                            })
                            .catch((err) => {
                                console.debug(err);
                            });
                        };

                        // Read in the image file as a data URL.
                        reader.readAsText(f);
                    },
                    (err) => {
                        $("#alert_message")
                        .html(`Error loading js/FileFormats/${type} - is the file format supported?`);
                        $("#alert_dialog").dialog("open");
                    });
            });

            // Cannot set the saver from inside the save handler because
            // loading a FileFormat requires a promise, but the native
            // click event on the download link is required to trigger the download,
            // which requires a true return from the handler.
            // So have to do it in two steps. Setting the save format
            // loads the saver and enables the save button if successful.
            // Clicking the save button saves using that saver.
        
            $("#download_dialog .format").on("change", function() {
                let type = $(this).val();
                requirejs(
                    [`js/FileFormats/${type}`],
                    (Format) => {
                        self.mSaver = new Format();
                        $("#download_dialog .download_button").removeProp("disabled");
                    });
            });
        
            $("#download_dialog .download_button").on("click", function() {
                let str = self.mSaver.save(self.mVisual);
                // If saver.save() returns null, then it has used a dialog and we
                // don't require native event handling
                if (!str)
                    return false; // suppress native event handling
                
                // The format wants to use the Save button to trigger the save
                this.href = URL.createObjectURL(new Blob([str]));
                let fmt = $("#download_dialog .format").val();
                this.download = `survey.${fmt}`;

                // Pass on for native event handling
                return true;
            });
        }
        
        get cursor() {
            return this.mRulerGeom.vertices[1];
        }

        get cursorWGS() {
            try {
                return Units.stringify(Units.IN, this.cursor, Units.LATLON);
            } catch (e) {
                //console.debug(e);
                return "Unknown";
            }
        }
        
        set cursor(v) {
            this.mRulerGeom.vertices[1].copy(v);
            this.mRulerGeom.verticesNeedUpdate = true;
            this.cursorChanged();
        }

        // Information tab
        cursorChanged() {
            $(".cursor_wgs").html(this.cursorWGS);
            $(".cursor_length").text(this.rulerLength);
            $(".cursor_bearing").text(this.rulerBearing);
        }

        get selection() {
            return this.mSelection;
        }

        setZoomGetter(fn) {
            this.mZoomGetter = fn;
        }

        get handleSize() {
            return this.mHandleSize / this.mZoomGetter.call();
        }
        
        resizeHandles(viewSize) {
            // Scale handles appropriately so they appear as
            // a fraction of the view
            if (viewSize) {
                this.mHandleSize = viewSize / 50;
                this.mCursorSprite.scale.x = this.mCursorSprite.scale.y
                = viewSize / 30;
            }
            this.mVisual.resizeHandles();
        }

        resizeCursor(factor) {
            this.mCursorSprite.scale.x /= factor;
            this.mCursorSprite.scale.y /= factor;
        }
        
        resetRuler(pos) {
            if (pos)
                this.cursor.copy(pos);
            else
                pos = this.cursor;
            this.rulerStart = pos;
            this.mRulerGeom.verticesNeedUpdate = true;
        }

        enableRuler(enable) {
            if (enable)  {
                this.mScene.add(this.mCursorSprite);
                this.mScene.add(this.mRulerLine);
            } else {
                this.mScene.remove(this.mCursorSprite);
                this.mScene.remove(this.mRulerLine);
            }
        }
        
        get boundingBox() {
            let bounds = this.mVisual.boundingBox;
            
            if (bounds.isEmpty()) {
                // Deal with an empty visual
                // A roughly 1nm square block of sea in the English Channel
                let ll = Units.convert(
                    Units.LATLON,
                    { lon: -0.5, lat: 50 },
                    Units.IN);
                ll = new Three.Vector3(ll.x, ll.y, -10);
                
                let ur = Units.convert(
                    Units.LATLON,
                    { lon: -0.483, lat: 50.017 },
                    Units.IN);
                ur = new Three.Vector3(ur.x, ur.y, 10);
                
                bounds = new Three.Box3(ll, ur);
            }
            return bounds;
        }
        
        /**
         * Get the Visual being handled by this controller
         * @return {VBisual} the root visual
         */
        get visual() {
            return this.mVisual;
        }

        /**
         * Get the Three.Scene generated from the visual in this canvas
         * @return {Three.Scene} the scene
         */
        get scene() {
            return this.mScene;
        }

        get rulerStart() {
            return this.mRulerGeom.vertices[0];
        }
        
        set rulerStart(v) {
            this.mRulerGeom.vertices[0].copy(v);
            this.mRulerGeom.verticesNeedUpdate = true;
            this.cursorChanged();
        }

        projectRay(ray) {
            return this.mVisual.projectRay(
                ray,
                Units.UPM[Units.IN] * Units.UPM[Units.IN]);
        }
        
        /**
         * Measure the planar distance between the start of the ruler
         * and the cursor
         */
        get rulerLength() {
            let dx = this.cursor.x - this.rulerStart.x;
            let dy = this.cursor.y - this.rulerStart.y;
            let dist = Math.sqrt(dx * dx + dy * dy) / Units.UPM[Units.IN];
            return dist.toFixed(2);
        }

        /**
         * Get the compass bearing between the start of the ruler and
         * the cursor
         */
        get rulerBearing() {
            let dx = this.cursor.x - this.rulerStart.x;
            let dy = this.cursor.y - this.rulerStart.y;
            if (dy === 0)
                return dx < 0 ? 270 : 90;
            let quad = (dx > 0) ? ((dy > 0) ? 0 : 180) : ((dy > 0) ? 360 : 180);
            return Math.round(quad + 180 * Math.atan(dx / dy) / Math.PI);
        }

        /**
         * Add a new POI under the ruler start
         */
        addPOI() {
            let pt = new POI(this.rulerStart, "New POI");
            this.mVisual.addChild(pt);
            pt.addToScene(this.scene);
            pt.resizeHandles();
            this.mSelection.add(pt);
        }

        /**
         * Add a new Sounding under the ruler start
         */
        addSounding() {
            let pt = new Sounding(this.rulerStart, "New sounding");
            this.mVisual.addChild(pt);
            pt.addToScene(this.scene);
            pt.resizeHandles();
            this.mSelection.add(pt);
        }

        selPrev() {
            let sel = this.mSelection.items.slice();
            for (let s of sel) {
                if (s.prev) {
                    this.mSelection.remove(s);
                    this.mSelection.add(s.prev);
                }
            }
            return false;
        }
    
        selNext() {
            let sel = this.mSelection.items.slice();
            for (let s of sel) {
                if (s.next) {
                    this.mSelection.remove(s);
                    this.mSelection.add(s.next);
                }
            }
            return false;
        }
        
        selParent() {
            let sel = this.mSelection.items.slice();
            for (let s of sel) {
                if (s.parent !== this.mVisual) {
                    this.mSelection.remove(s);
                    this.mSelection.add(s.parent);
                }
            }
            return false;
        }
        
        selFirstChild() {
            let sel = this.mSelection.items.slice();
            for (let s of sel) {
                if (s.children && s.children.length > 0) {
                    this.mSelection.remove(s);
                    this.mSelection.add(s.children[0]);
                }
            }
            return false;
        }
        
        selDelete() {
            for (let sel of this.mSelection.items)
                // Remove the item completely
                sel.remove();
            this.mSelection.clear();
            return false;
        }

        /**
         * Add a new path, two points, one at the rulerStart, the other
         * nearby
         */
        addPath() {
            let visual = new Path("New path");
            visual.addVertex(this.rulerStart);
            visual.addVertex({
                x: this.rulerStart.x + 2 * Units.UPM[Units.IN],
                y: this.rulerStart.y + 2 * Units.UPM[Units.IN],
                z: this.rulerStart.z
            });
            this.mVisual.addChild(visual);
            visual.addToScene(this.mScene);
            visual.resizeHandles();
            this.mSelection.add(visual);
        }

        /**
         * Add a new contour, three points centred on the start of the
         * ruler, 1m radius
         */
        addContour() {
            let visual = new Contour("New point");
            visual.addVertex(
                {
                    x: this.rulerStart.x,
                    y: this.rulerStart.y + Units.UPM[Units.IN]
                });
            visual.addVertex(
                {
                    x: this.rulerStart.x + 0.866 * Units.UPM[Units.IN],
                    y: this.rulerStart.y - 0.5 * Units.UPM[Units.IN]
                });
            visual.addVertex(
                {
                    x: this.rulerStart.x - 0.866 * Units.UPM[Units.IN],
                    y: this.rulerStart.y - 0.5 * Units.UPM[Units.IN]
                });
            visual.close();
            visual.setZ(0);
            this.mVisual.addChild(visual);
            visual.addToScene(this.mScene);
            visual.resizeHandles();
            this.mSelection.add(visual);
        }

        /**
         * Split all edges that are selected by virtue of their
         * endpoints being selected. Edges are split at their midpoint.
         */
        splitEdges() {
            if (this.mSelection.isEmpty)
                return;
            let sel = this.mSelection.items;
            // Split edges where both end points are in the selection
            let split = [];

            for (let i = 0; i < sel.length; i++) {
                let s = sel[i];
                if (s instanceof Spot) {
                    for (let j = i + 1; j < sel.length; j++) {
                        let ss = sel[j];
                        if (ss !== s
                            && ss.parent === s.parent
                            && s.parent.hasEdge
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
            this.mSelection.resizeHandles();
        }
    }
    
    return SceneController;
});
