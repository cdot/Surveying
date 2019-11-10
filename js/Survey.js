define("js/Survey", ["three", "js/Container", "js/UTM", "jquery"], function(Three, Container, UTM) {

    /**
     * Add interactive display and manipulation to a top-level Container
     */
    class Survey extends Container {

        /**
         * @param renderer Three.WebGLRenderer
         */
        constructor(renderer) {
            super("survey");
            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xFFFFFF);
            this.mRenderer = renderer;
            this.mDot2 = 1;
        
            this.mCursorGeom = new Three.Geometry();
            this.mCursorP0 = new Three.Vector3(0, 0, 0);
            this.mCursorP1 = new Three.Vector3(0, 0, -1);
            this.mCursorGeom.vertices.push(this.mCursorP0);
            this.mCursorGeom.vertices.push(this.mCursorP1);
            let rayLine = new Three.Line(
                this.mCursorGeom, new Three.LineBasicMaterial({color: 0xFFFFFF}));
            this.mScene.add(rayLine);
            this.mMetadata = {
                // Information used for formats which support saving
                reference_point: {
                    lat: 51.477905, lon: 0,// Greenwich
                    x: 0, y : 0 // bottom left corner
                },
                units_per_metre: 1,
                zone: undefined, // Locate the zone for UTM coords
                band: undefined
            };
        }

        /**
         * Convert a point in user units to the current save units
         */
        user2saveUnits(p) {
            let origin = UTM.fromLatLong(this.mMetadata.reference_point.lat,
                                         this.mMetadata.reference_point.lon,
                                         this.mMetadata.zone);
            return {
                x: (p.x - origin.easting) * this.mMetadata.units_per_metre,
                y: (p.y - origin.northing) * this.mMetadata.units_per_metre
            };
        }

        get utmZone() {
            return this.mMetadata.zone;
        }
        
        get utmBand() {
            return this.mMetadata.band;
        }
        
        // @Override Network
        get tag() {
            return "survey";
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
         * Return a promise to load the network by parsing data that
         * was read from the given file.
         * The file extension is used to determine which loader to use.
         * @param {String} data file contents
         * @param {String} fn filename (or other identifier)
         */
        load(fn, data) {
            let type = fn.replace(/^.*\./, "").toLowerCase();
            return new Promise(resolve => {
                requirejs(["js/FileFormats/" + type], Format => {
                    resolve(new Format().load(fn, data, this.mMetadata));
                });
            })
            .then(loadData => {
                for (let obj of loadData.objects) {
                    this.addObject(obj);
                    obj.addToScene(this.mScene);
                }
                this.refocus();
            });
        }

        zoom(factor) {
            if (this.mCamera)
                this.mScene.remove(this.mCamera);            

            let dx = this.mViewport.max.x - this.mViewport.min.x;
            let dy = this.mViewport.max.y - this.mViewport.min.y;
            dx = (dx * factor - dx) / 2;
            dy = (dy * factor - dy) / 2;
            this.mViewport.min.x += dx;
            this.mViewport.max.x -= dx;
            this.mViewport.min.y += dy;
            this.mViewport.max.y -= dy;

            let sz = new Three.Vector3();
            this.mViewport.getSize(sz);
            sz.z = 0;
            let dot = sz.length() / 200;
            this.setScale(dot);
            
            //console.log("Zoom", this.mViewport.min, this.mViewport.max);
            
            // left right top bottom near far
            this.mCamera = new Three.OrthographicCamera(
                this.mViewport.min.x, this.mViewport.max.x,
                this.mViewport.max.y, this.mViewport.min.y,
                // Looking UP the z axis
                this.mViewport.min.z - 1, this.mViewport.max.z + 1);
            this.mScene.add(this.mCamera);
            this.mRenderer.render(this.mScene, this.mCamera);

            $(document).trigger("viewchanged");
        }

        get viewport() {
            return this.mViewport;
        }
        
        panBy(delta) {
            this.mViewport.min.x += delta.x;
            this.mViewport.max.x += delta.x;
            this.mViewport.min.y += delta.y;
            this.mViewport.max.y += delta.y;
            this.zoom(1);
        }
        
        centreAt(pt) {
            let cx = (this.mViewport.max.x + this.mViewport.min.x) / 2;
            let cy = (this.mViewport.max.y + this.mViewport.min.y) / 2;
            this.panBy({x: pt.x - cx, y: pt.y - cy});
        }
        
        // Refocus the camera on the entire scene
        refocus() {
            let bounds = this.boundingBox.clone();
            let w = bounds.max.x - bounds.min.x;
            let h = bounds.max.y - bounds.min.y;
            let dx =  (bounds.max.x - bounds.min.x);
            let dot = dx / 100;

            bounds.min.z -= 2 * dot;
            bounds.max.z += 2 * dot;

            this.mViewport = bounds;

            this.mCursorP0.x = (bounds.min.x + bounds.max.x) / 2;
            this.mCursorP0.y = (bounds.min.y + bounds.max.y) / 2;
            this.mCursorP1.x = this.mCursorP0.x;
            this.mCursorP1.y = this.mCursorP0.y;

            this.zoom(1);
            $(document).trigger("scenechanged");
        }

        reanimate() {
            if (this.mInterrupted)
                return;
            window.requestAnimationFrame(() => { this.reanimate(); });
            this.mRenderer.render(this.mScene, this.mCamera);          
        }

        animate() {
            this.mInterrupted = false;
            this.reanimate();
        }
        
        stopAnimation() {
            this.mInterrupted = true;
        }
    }
    return Survey;
});
