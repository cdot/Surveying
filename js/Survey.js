define("js/Survey", ["three", "js/Vertex", "js/Edge", "js/Network", "js/GreatCircle", "jquery"], function(Three, Vertex, Edge, Network, GreatCircle) {

    /**
     * Add interactive display and manipulation to a top-level Network
     */
    class Survey extends Network {

        /**
         * @param renderer Three.WebGLRenderer
         */
        constructor(renderer) {
            super("root");
            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xFFFFFF);
            this.mRenderer = renderer;
            this.mDot2 = 1;
        
            this.cursorGeom = new Three.Geometry();
            this.cursorP0 = new Three.Vector3(0, 0, 0);
            this.cursorP1 = new Three.Vector3(0, 0, 1);
            this.cursorGeom.vertices.push(this.cursorP0);
            this.cursorGeom.vertices.push(this.cursorP1);
            let rayLine = new Three.Line(
                this.cursorGeom, new Three.LineBasicMaterial({color: 0xFFFFFF}));
            this.mScene.add(rayLine);
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
                let dir = new Three.Vector3(0, 0, 1);
                dir.transformDirection(this.mCamera.matrixWorld);
                tgt = pos.clone().add(dir);
            } else {
                tgt = pos;
                pos = this.mCamera.position;
            }
            //this.cursorP0.copy(pos);
            this.cursorP1.copy(tgt);
            this.cursorGeom.verticesNeedUpdate = true;
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
                requirejs(["js/Loaders/" + type], Loader => {
                    resolve(new Loader(fn, data).load());
                });
            })
            .then(nets => {
                for (let net of nets) {
                    this.addObject(net);
                    net.addToScene(this.mScene);
                }
                this.refocus();
            });
        }

        zoom(factor) {
            if (this.mCamera)
                this.mScene.remove(this.mCamera);            

            let dx = this.mZoomBox.max.x - this.mZoomBox.min.x;
            let dy = this.mZoomBox.max.y - this.mZoomBox.min.y;
            dx = (dx * factor - dx) / 2;
            dy = (dy * factor - dy) / 2;
            this.mZoomBox.min.x += dx;
            this.mZoomBox.max.x -= dx;
            this.mZoomBox.min.y += dy;
            this.mZoomBox.max.y -= dy;
            
            //console.log("Zoom", this.mZoomBox.min, this.mZoomBox.max);

            let dot = (this.mZoomBox.max.x - this.mZoomBox.min.x) / 200;
            this.scale(dot);
            
            // left right top bottom near far
            this.mCamera = new Three.OrthographicCamera(
                this.mZoomBox.min.x, this.mZoomBox.max.x,
                this.mZoomBox.max.y, this.mZoomBox.min.y,
                this.mZoomBox.min.z, this.mZoomBox.max.z);
            this.mScene.add(this.mCamera);
            this.mRenderer.render(this.mScene, this.mCamera);          
        }

        panBy(delta) {
            this.mZoomBox.min.x += delta.x;
            this.mZoomBox.max.x += delta.x;
            this.mZoomBox.min.y += delta.y;
            this.mZoomBox.max.y += delta.y;
            this.zoom(1);
        }
        
        centreAt(pt) {
            let cx = (this.mZoomBox.max.x + this.mZoomBox.min.x) / 2;
            let cy = (this.mZoomBox.max.y + this.mZoomBox.min.y) / 2;
            this.panBy({x: pt.x - cx, y: pt.y - cy});
        }
        
        // Refocus the camera on the entire scene
        refocus() {
            let bounds = this.boundingBox;
            let w = bounds.max.x - bounds.min.x;
            let h = bounds.max.y - bounds.min.y;
            let dx =  (bounds.max.x - bounds.min.x);
            let dot = dx / 100;

//            bounds.min.x -= 2 * dot;
//            bounds.min.y -= 2 * dot;
            bounds.min.z -= 2 * dot;
//            bounds.max.x += 2 * dot;
//            bounds.max.y += 2 * dot;
            bounds.max.z += 2 * dot;

            // That's our bounds in WGS84 coordinates. To work out the aspect ratios we
            // need to convert to metres
            let wm = GreatCircle.distanceAndBearing(bounds.min.y, bounds.min.x, bounds.min.y, bounds.max.x).distance;
            let hm = GreatCircle.distanceAndBearing(bounds.min.y, bounds.min.x, bounds.max.y, bounds.min.x).distance;
            console.log("Area in metres", wm, "x", hm);

            if (wm > hm) {
                bounds.max.y = bounds.min.y + w * hm / wm;
            } else {
                bounds.max.x = bounds.min.x + h * wm / hm;
            }
            
            this.mZoomBox = bounds;

            this.cursorP0.x = (bounds.min.x + bounds.max.x) / 2;
            this.cursorP0.y = (bounds.min.y + bounds.max.y) / 2;
            this.cursorP1.x = this.cursorP0.x;
            this.cursorP1.y = this.cursorP0.y;

            this.zoom(1);
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