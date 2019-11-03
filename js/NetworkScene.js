define("js/NetworkScene", ["three", "js/Vertex", "js/Edge", "js/Group", "js/Network", "jquery"], function(Three, Vertex, Edge, Group, Network) {

    class NetworkScene extends Network {

        /**
         * @param renderer Three.WebGLRenderer
         */
        constructor(renderer) {
            super("root");
            this.mScene = new Three.Scene();
            this.mScene.background = new Three.Color(0xFFFFFF);
            this.mRenderer = renderer;

            this.cursorGeom = new Three.Geometry();
            this.cursorP0 = new Three.Vector3(0, 0, 0);
            this.cursorP1 = new Three.Vector3(0, 0, 1);
            this.cursorGeom.vertices.push(this.cursorP0);
            this.cursorGeom.vertices.push(this.cursorP1);
            let rayLine = new Three.Line(
                this.cursorGeom, new Three.LineBasicMaterial({color: 0xFFFFFF}));
            this.mScene.add(rayLine);
        }
        
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

        load(fn, data) {
            let promise;
            if (/^<\?xml/i.test(data)) {
                let dom = new DOMParser().parseFromString(data, "text/xml");
                let type = dom.firstChild;
                while (type.nodeType !== 1)
                    type = type.nextSibling;
                type = type.tagName.toUpperCase();
                promise = new Promise(resolve => {
                    requirejs(["js/Load" + type], Loader => {
                        resolve(Loader(dom));
                    });
                });
            } else if (/\.csv$/i.test(fn)) {
                promise = new Promise(resolve => {
                    requirejs(["js/Load" + type], Loader => {
                        resolve(Loader(data));
                    });
                });
            } else
                throw "Unhandled " + fn;
            
            return promise.then(groups => {
                for (let group of groups) {
                    this.addGroup(group);
                    group.addToScene(this.mScene);
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
            
            console.log("Zoom", this.mZoomBox.min, this.mZoomBox.max);

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

        centre(pt) {
            let cx = (this.mZoomBox.max.x + this.mZoomBox.min.x) / 2;
            let cy = (this.mZoomBox.max.y + this.mZoomBox.min.y) / 2;
            let dx = pt.x - cx;
            let dy = pt.y - cy;
            this.mZoomBox.min.x += dx;
            this.mZoomBox.max.x += dx;
            this.mZoomBox.min.y += dy;
            this.mZoomBox.max.y += dy;
            this.zoom(1);
        }
        
        // Refocus the camera on the entire scene
        refocus() {
            let bounds = this.boundingBox;
            let w = bounds.max.x - bounds.min.x;
            let h = bounds.max.y - bounds.min.y;
            
            if (w > h) {
                let delta = (w - h) / 2;
                bounds.max.y += delta; bounds.min.y -= delta;
            } else if (w < h) {
                let delta = (h - w) / 2;
                bounds.max.x += delta; bounds.min.x -= delta;
            }
            let dx =  (bounds.max.x - bounds.min.x);
            let dot = dx / 100;

            bounds.min.x -= 2 * dot;
            bounds.min.y -= 2 * dot;
            bounds.min.z -= 2 * dot;
            bounds.max.x += 2 * dot;
            bounds.max.y += 2 * dot;
            bounds.max.z += 2 * dot;
            
            this.mZoomBox = bounds;

            this.cursorP0.x = (bounds.min.x + bounds.max.x) / 2;
            this.cursorP0.y = (bounds.min.y + bounds.max.y) / 2;
            this.cursorP1.x = this.cursorP0.x;
            this.cursorP1.y = this.cursorP0.y;

            this.zoom(1);
        }

        removeVertex(v) {
            v.removeFromScene(this.mScene);
            super.removeVertex(v);
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
    return NetworkScene;
});
