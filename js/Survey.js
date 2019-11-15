define("js/Survey", ["js/Container", "three", "js/UTM", "js/Materials", "jquery"], function(Container, Three, UTM, Materials) {

    /**
     * Add interactive display and manipulation to a top-level Container
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

            // Size of a handle in world coordinates
            this.mHandleSize = 1;
            
            this.animate();
        }

        /**
         * Map a canvas point into a 3D line projecting into the scene
         * @param pt Object {x: y: }
         * @return {Three.Line} ray
         */
        canvas2ray(pt) {
            if (!this.mCamera)
                return null;
            
            let ortho = (this.mCamera instanceof Three.OrthographicCamera);

            let pos = new Three.Vector3(
                2 * pt.x - 1, 1 - 2 * pt.y,
                ortho ? -1 : 0.5 /* important */);
            
            pos.unproject(this.mCamera);

            let tgt;
            if (ortho) {
                // Looking UP the z axis
                let dir = new Three.Vector3(0, 0, 1);
                dir.transformDirection(this.mCamera.matrixWorld);
                tgt = pos.clone().add(dir);
            } else {
                tgt = pos;
                pos = this.mCamera.position;
            }
            this.mCursor.x = tgt.x;
            this.mCursor.y = tgt.y;
            this.mRulerGeom.verticesNeedUpdate = true;
            //console.debug("Cursor",this.mCursor);
            $(document).trigger("cursorchanged");
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
            if (this.mCamera) {
                this.mCamera.zoom *= factor;
                this.setHandleScale(this.mHandleSize / this.mCamera.zoom);
                this.mCamera.updateProjectionMatrix();
            }
        }
        
        panBy(delta) {
            this.mLookAt.x += delta.x;
            this.mLookAt.y += delta.y;
            if (this.mCamera) {
                this.mCamera.lookAt(this.mLookAt);
                this.mCamera.updateProjectionMatrix();
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
        
        // Reposition the camera so it is looking down on the
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

            this.mCameraPosition = new Three.Vector3(
                this.mLookAt.x, this.mLookAt.y, viewSize);

            if (this.mCamera) {
                this.mScene.remove(this.mCamera);
                delete this.mCamera;
            }

            let v = {
                left: -this.mAspectRatio * viewSize / 2,
                right: this.mAspectRatio * viewSize / 2,
                top: viewSize / 2,
                bottom: -viewSize / 2,
                near: 0.1,
                far: viewSize * 10
            };
            this.mCamera = new Three.OrthographicCamera(
                v.left, v.right, v.top, v.bottom, v.near, v.far);

            //this.mCamera = new Three.PerspectiveCamera(
            //    45, this.mAspectRatio, 0.1, 1000);

            this.mCamera.up = new Three.Vector3(0, 1, 0);
            this.mCamera.position.copy(this.mCameraPosition);
            this.mCamera.lookAt(this.mLookAt);
            this.mCamera.updateProjectionMatrix();
            /*
            let a = this.mCamera.getWorldPosition(new Three.Vector3());
            let b = this.mCamera.getWorldDirection(new Three.Vector3());
            console.log("Orthographic ", v,
                        "look", b,
                        "from", a); */
            
            this.mScene.add(this.mCamera);

            // WTF IS GOING ON? Where has my ruler gone? :-(
            bounds.getCenter(this.mRulerStart);
            bounds.getCenter(this.mCursor);
            this.mRulerGeom.verticesNeedUpdate = true;

            $(document).trigger("scenechanged");
        }

        animate() {
            window.requestAnimationFrame(() => {
                this.animate();
            });
            if (this.mScene && this.mCamera)
                this.mRenderer.render(this.mScene, this.mCamera);          
        }
    }
    return Survey;
});
