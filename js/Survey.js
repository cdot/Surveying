define("js/Survey", ["three", "js/Container", "js/UTM", "jquery"], function(Three, Container, UTM) {

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
            this.mScene.background = new Three.Color(0xFFFFFF);

            this.mCursorGeom = new Three.Geometry();
            this.mCursorP0 = new Three.Vector3(0, 0, 0);
            this.mCursorP1 = new Three.Vector3(0, 0, -1);
            this.mCursorGeom.vertices.push(this.mCursorP0);
            this.mCursorGeom.vertices.push(this.mCursorP1);
            let rayLine = new Three.Line(
                this.mCursorGeom,
                new Three.LineBasicMaterial({color: 0xFFFF00}));
            this.mScene.add(rayLine);

            // Centre of the viewing frustum - will be set when
            // we refocus()
            this.mLookAt = new Three.Vector3(0, 0, 0);
            
            this.mMetadata = {
                // Information used for formats which support saving
                //reference_point: {
                //    lat: 51.477905, lon: 0,// Greenwich
                //    x: 0, y : 0 // bottom left corner
                //},
                units_per_metre: 10
            };

            this.animate();
        }

        /**
         * Convert a point in user units to the current save units
         */
        user2saveUnits(p) {
            if (p instanceof Three.Box3) {
                return new Three.Box3(
                    this.user2saveUnits(p.min),
                    this.user2saveUnits(p.max));
            } else {
                let origin = UTM.fromLatLong(this.mMetadata.reference_point.lat,
                                             this.mMetadata.reference_point.lon);
                return new Three.Vector3(
                    (p.x - origin.easting) * this.mMetadata.units_per_metre,
                    (p.y - origin.northing) * this.mMetadata.units_per_metre,
                    0);
            }
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
            //this.mCursorP0.copy(pos);
            this.mCursorP1.copy(tgt);
            this.mCursorGeom.verticesNeedUpdate = true;
            return new Three.Line3(pos, tgt);
        }

        /**
         * Load a set of visuals into the current network.
         * @param {[Visual]} visuals
         */
        addVisuals(visuals) {
            for (let obj of visuals) {
                this.addChild(obj);
                obj.addToScene(this.mScene);
            }
            this.fitScene();
        }

        setMetadata(options) {
            if (!options) return;
            if (!this.mMetadata.reference_point && !options.reference_point) {
                let bb = this.boundingBox;
                let bl = new UTM(bb.min.x, bb.min.y);
                let ll = bl.toLatLong();
                options.reference_point = {
                    x: 0, y: 0,
                    lat: ll.latitude, lon: ll.longitude
                };
            }
            $.extend(this.mMetadata, options);
        }

        get metadata() {
            return this.mMetadata;
        }
        
        zoom(factor) {
            if (this.mCamera) {
                this.mCamera.zoom *= factor;
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
        
        // Reposition the camera so it is looking down on the
        // entire scene
        fitScene() {
            let bounds = this.boundingBox;
            console.debug("Bounding box", bounds);
            // Look at the centre of the scene
            bounds.getCenter(this.mLookAt);
            let sz = bounds.getSize(new Three.Vector3());
            this.mViewSize = Math.max(sz.x, sz.y)
            this.mCameraPosition = new Three.Vector3(
                this.mLookAt.x, this.mLookAt.y, this.mViewSize);
            
            this.mCursorP0.x = this.mLookAt.x;
            this.mCursorP0.y = this.mLookAt.y;
            this.mCursorP1.x = this.mCursorP0.x;
            this.mCursorP1.y = this.mCursorP0.y;

            if (this.mCamera) {
                this.mScene.remove(this.mCamera);
                delete this.mCamera;
            }

            //this.mViewSize *= factor;

            let v = {
                left: -this.mAspectRatio * this.mViewSize / 2,
                right: this.mAspectRatio * this.mViewSize / 2,
                top: this.mViewSize / 2,
                bottom: -this.mViewSize / 2,
                near: 0.1,
                far: this.mViewSize * 10
            };
            // viewSize must be in world space units
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
            this.setHandleSize(this.mViewSize / 200);
            this.mScene.add(this.mCamera);

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
