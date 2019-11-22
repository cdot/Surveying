define("js/Survey", ["js/Container", "three", "js/UTM", "js/Materials", "js/Point", "js/Vertex", "js/Edge", "js/Network", "delaunator", "js/OrbitControls", "jquery"], function(Container, Three, UTM, Materials, Point, Vertex, Edge, Network, Delaunator, OrbitControls) {

    /**
     * Add interactive display and manipulation to a Container
     */
    class Survey extends Container {

        /**
         * @param renderer Three.WebGLRenderer
         */
        constructor($canvas) {
            super("survey");

            this.mRenderer = new Three.WebGLRenderer();

            let h = $canvas.innerHeight();
            let w = $canvas.innerWidth();
            $canvas.height(h);
            $canvas.width(w);
            this.mRenderer.setSize(w, h);
            this.mAspectRatio = w / h;
            $canvas.append(this.mRenderer.domElement);

            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xF0F0F0);

            // Set up ruler geometry
            this.mRulerGeom = new Three.Geometry();
            // Start of measure line
            this.mRulerStart = new Three.Vector3(0, 0, 0);
            this.mRulerGeom.vertices.push(this.mRulerStart);
            // End of measure line under the cursor
            this.mCursor = new Three.Vector3(0, 0, 0);
            this.mRulerGeom.vertices.push(this.mCursor);
            let rulerLine = new Three.Line(this.mRulerGeom, Materials.RULER);
            this.mScene.add(rulerLine);

            // Centre of the viewing frustum - will be set when
            // we refocus()
            this.mLookAt = new Three.Vector3(0, 0, 0);
            this.mCameraPosition = new Three.Vector3(0, 0, 0);
            
            let cams = {
                orthographic: new Three.OrthographicCamera(-1, 1, 1, -1),
                perspective: new Three.PerspectiveCamera()
            };

            for (let c in cams)
                this.mScene.add(cams[c]);

            this.mCameras = cams;
            
            this.mActiveCamera = "orthographic";

//            this.mControls = new OrbitControls(
//                this.camera, this.mRenderer.domElement);
            
            // Size of a handle in world coordinates
            this.mHandleSize = 1;
            
            this.animate();
        }

        get camera() {
            return this.mCameras[this.mActiveCamera];
        }
        
        /**
         * Map a canvas point into a 3D line projecting into the scene
         * @param pt Object {x: y: }
         * @return {Three.Line} ray
         */
        canvas2ray(pt) {
            if (this.children.length === 0)
                return null;
            
            let ortho = (this.mActiveCamera === "orthographic");

            let pos = new Three.Vector3(
                2 * pt.x - 1, 1 - 2 * pt.y,
                ortho ? -1 : 0.5 /* important */);
            
            pos.unproject(this.camera);

            let tgt;
            if (ortho) {
                // Looking UP the z axis
                let dir = new Three.Vector3(0, 0, 1);
                dir.transformDirection(this.camera.matrixWorld);
                tgt = pos.clone().add(dir);
            } else {
                tgt = pos;
                pos = this.camera.position;
            }
            this.mCursor.x = tgt.x;
            this.mCursor.y = tgt.y;
            this.mRulerGeom.verticesNeedUpdate = true;
            //console.debug("Cursor",this.mCursor);
            return new Three.Line3(pos, tgt);
        }

        // @Override Container
        addChild(vis) {
            super.addChild(vis);
            // Merge child metadata with this level
            if (vis.metadata) {
                let options = vis.metadata;
                if (!this.metadata.reference_point
                    && !options.reference_point) {
                    let bb = this.boundingBox;
                    let bl = new UTM(bb.min.x, bb.min.y);
                    let ll = bl.toLatLong();
                    options.reference_point = {
                        x: 0, y: 0,
                        lat: ll.latitude, lon: ll.longitude
                    };
                }
                $.extend(this.metadata, options);
            }
            vis.addToScene(this.mScene);
        }

        zoom(factor) {
            if (this.camera) {
                this.camera.zoom *= factor;
                this.setHandleScale(
                    this.mHandleSize / this.camera.zoom);
                this.camera.updateProjectionMatrix();
            }
        }
        
        panBy(delta) {
            this.mLookAt.x += delta.x;
            this.mLookAt.y += delta.y;
            if (this.camera) {
                this.camera.position.set(
                    this.mLookAt.x, this.mLookAt.y, this.camera.position.z);
                this.camera.lookAt(this.mLookAt);
                this.camera.updateProjectionMatrix();
            }
        }

        get cursor() {
            return this.mCursor;
        }

        get boundingBox() {
            let bounds = super.boundingBox;

            if (bounds.isEmpty()) {
                // Fitting without a scene
                // A roughly 1nm square block of sea in the English Channel
                let ll = UTM.fromLatLong(50, -0.5);
                let ur = UTM.fromLatLong(50.017, -0.483);
                
                // If nothing has been loaded yet, we may have an empty
                // scene to deal with
                bounds = new Three.Box3();
                bounds.expandByPoint(
                    new Three.Vector3(ll.easting, ll.northing, -10)),
                bounds.expandByPoint(
                    new Three.Vector3(ur.easting, ur.northing, 10));
            }
            
            return bounds;
        }
        
        /**
         * Set the start of the ruler to be the cursor point
         */
        measureFrom() {
            this.mRulerStart.copy(this.mCursor);
            this.mRulerGeom.verticesNeedUpdate = true;
            //console.log("measure", this.mRulerGeom.vertices);
        }

        /**
         * Measure the planar distance between the start of the ruler
         * and the cursor
         */
        get rulerLength() {
            let dx = this.mCursor.x - this.mRulerStart.x;
            let dy = this.mCursor.y - this.mRulerStart.y;
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
        
        // Reposition the cameras so they are looking down on the
        // entire scene
        fitScene() {
            let bounds = this.boundingBox;

            // Look at the centre of the scene
            bounds.getCenter(this.mLookAt);

            let sz = bounds.getSize(new Three.Vector3());
            let viewSize = Math.max(sz.x, sz.y)

            // Scale handles appropriately so they appear as
            // a fraction of the canvas width
            this.mHandleSize = viewSize / 200;
            this.setHandleScale(this.mHandleSize);

//            this.mControls.target = this.mLookAt;

            this.mCameraPosition = new Three.Vector3(
                this.mLookAt.x, this.mLookAt.y, viewSize);

            // Orthographic camera specifics
            let c = this.mCameras.orthographic;
            let v = {
                left: -this.mAspectRatio * viewSize / 2,
                right: this.mAspectRatio * viewSize / 2,
                top: viewSize / 2,
                bottom: -viewSize / 2,
                near: 0.1,
                far: viewSize * 10
            };
            c.left = v.left;
            c.right = v.right;
            c.top = v.top;
            c.bottom = v.bottom;
            c.near = v.near;
            c.far = v.far;

            for (let i in this.mCameras) {
                c = this.mCameras[i];
                c.up = new Three.Vector3(0, 1, 0);
                c.position.copy(this.mCameraPosition);
                c.lookAt(this.mLookAt);
                c.updateProjectionMatrix();
            }

            if (!this.camera)
                this.mActiveCamera = "orthographic";
 
            // Ruler/cursor
            bounds.getCenter(this.mRulerStart);
            bounds.getCenter(this.mCursor);
            this.mRulerGeom.verticesNeedUpdate = true;

            $(document).trigger("scenechanged");
        }

        animate() {
            requestAnimationFrame(() => {
                this.animate();
            });
//            if (this.mControls)
//                this.mControls.update();
            if (this.mScene && this.camera)
                this.mRenderer.render(this.mScene, this.camera);
        }

        /**
         * Construct a new Network object that contains a Delaunay
         * triangulation of all the Point objects in the survey
         */
        meshify() {
            function nextHalfedge(e) {
                return (e % 3 === 2) ? e - 2 : e + 1;
            }

            // Condense isobaths and soundings into a cloud of points
            let coords = [];
            let mapBack = [];
            this.condense(coords, mapBack);

            let del = Delaunator.from(coords);
            let result = new Network("Triangulation");

            // Construct a mesh, adding condensed points back in as vertices
            for (let i in mapBack) {
                let c = mapBack[i];
                if (c instanceof Point)
                    mapBack[i] = c = new Vertex(c.name, c.position);
                result.addChild(c);
            }
            
            // Iterate over the forward edges
            for (let e = 0; e < del.triangles.length; e++) {
                if (e > del.halfedges[e]) {
                    // Not a back-edge
                    let p = mapBack[del.triangles[e]];
                    let q = mapBack[del.triangles[nextHalfedge(e)]];
                    if (!p || !q) debugger;
                    result.addEdge(new Edge(p, q));
                }
            }
            this.addChild(result);
            result.addToScene(this.mScene);
        }
    }
    return Survey;
});
