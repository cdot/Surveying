/* @preserve Copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */
define("js/SceneController", ["three", "js/Selection", "js/Container", "js/POI", "js/Path", "js/Contour", "js/Sounding", "js/Spot", "js/Units", "js/UTM", "js/Materials", "delaunator", "jquery"], function(Three, Selection, Container, POI, Path, Contour, Sounding, Spot, Units, UTM, Materials, Delaunator) {

     // Given a schema, make the HTML controls that support editing of
     // that schema
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

    /**
     * Manager class for a scene, rooted at a visual and displayed
     * using a Three.Object3D. Supports view-independant operations on
     * the objects in the scene. This object is responsible for managing
     * the selection, handles, 
     */   
    class SceneController {

        constructor() {
            this.mVisual = new Container("root");
            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xF0F0F0);
            this.mScene.userData.controller = this;
 
            // Size of a handle in world coordinates = 50cm
            this.mHandleSize = Units.UPM[Units.IN] / 2;

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

        /**
         * Finish up after leading a new visual
         */
        _onLoadedVisual(fn, visual) {
            this.mVisual.addChild(visual);
            visual.addToScene(this.mScene);
            this.meshify();
            let bb = this.mVisual.boundingBox;
            let min = Units.stringify(Units.IN, bb.min, Units.LATLON);
            let max = Units.stringify(Units.IN, bb.max, Units.LATLON);
            console.log(`Loaded ${fn}, ${min} -> ${max}`);
            $(document).trigger("fitViews");
        }

        /**
         * Add in handlers for load and save dialogs
         */
        _bindDialogHandlers() {
            let self = this;

            // Local file upload
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
                            .then((visual) => {
                                self._onLoadedVisual(fn, visual);
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

            // Download to local file
            let saver;
            $("#download_dialog .download_button").on("click", function() {
                let str = saver.save(self.mVisual);
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
                        saver = new Format();
                        $("#download_dialog .download_button")
                        .removeProp("disabled");
                    });
            });
        }
        
        /**
         * Canvas controllers use this to publicise the current method
         * for getting the zoom factor. This is required to set handle
         * and cursor sizes.
         */
        setZoomGetter(fn) {
            this.mZoomGetter = fn;
        }

        /**
         * Get the handle size scaled as appropriate for the current view
         */
        get handleSize() {
            return this.mHandleSize / this.mZoomGetter.call();
        }
        /**
         * Resize all handles in the visual so they appear as a
         * fraction of the view
         */
        resizeHandles(viewSize) {
            // Scale handles appropriately 
            if (viewSize) {
                this.mHandleSize = viewSize / 50;
            }
            this.mVisual.resizeHandles();
        }

        /**
         * Get the current selection in the scene
         */
        get selection() {
            return this.mSelection;
        }

        /**
         * Get the bounding box for the visual, or a suitable box if
         * no visual is currently displayed
         */
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
         * @return {Visual} the root visual
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

        /**
         * Project the given ray into the scene. @see Visual
         */
        projectRay(ray) {
            return this.mVisual.projectRay(
                ray,
                Units.UPM[Units.IN] * Units.UPM[Units.IN]);
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
            this.meshify();
        }

        /**
         * Change the selection to select the sibling before it in the
         * scene. Applies across all items in the visual.
         */
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
    
        /**
         * Change the selection to select the sibling after it in the
         * scene. Applies across all items in the visual.
         */
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
        
        /**
         * Change the selection to select the parent of it in the
         * scene. Applies across all items in the visual.
         */
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
        
        /**
         * Change the selection to select the first child (if it has
         * children). Applies across all items in the visual.
         */
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

        /**
         * Delete all currently selected items
         */
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
            this.meshify();
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
                if (v) {
                    this.mSelection.add(v);
                    v.resizeHandles();
                }
            }
            this.meshify();
        }

        /**
         * Update the Delaunay triangulation of all the vertices in
         * the visual
         */
        meshify() {
            if (this.mMesh)
                this.mScene.remove(this.mMesh);

            // Condense Contours and Soundings into a cloud of points
            // and edges - @see Visual
            let v = [];
            let e = [];
            this.mVisual.condense(v, e);

            let geom = new Three.Geometry();
            let coords = [];
            for (let o of v) {
                coords.push([o.x, o.y]);
                geom.vertices.push(o);
            }

            let del = Delaunator.from(coords);

            for (let t = 0; t < del.triangles.length / 3; t++) {
                geom.faces.push(new Three.Face3(
                    del.triangles[3 * t + 2],
                    del.triangles[3 * t + 1],
                    del.triangles[3 * t]));
            }

            geom.computeFaceNormals();
            geom.computeVertexNormals();
            
            this.mMesh = new Three.Mesh(geom, Materials.MESH);
            this.mScene.add(this.mMesh);
        }
    }
    
    return SceneController;
});
