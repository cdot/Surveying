/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Path", ["js/Container", "three", "js/Spot", "js/Materials"], function(Container, Three, Spot, Materials) {

    class PathVertex extends Spot {
        
        // @Override Visual
        addToScene(scene) {
            // A vertex only has a visual representation when
            // it is highlighted
            this.mScene = scene;
        }

        // @Override Spot
        setPosition(p) {
            super.setPosition(p);
            if (this.parent.mGeometry)
                this.parent.mGeometry.verticesNeedUpdate = true;
        }
        
        // @Override Spot
        highlight(on) {
            if (!on) {
                if (this.object3D && this.object3D.parent)
                    this.object3D.parent.remove(this.object3D);
                return;
            }

            if (!this.mScene)
                return;

            // Once created, we keep the handle object around as it
            // will be useful again
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.setObject3D(new Three.Sprite(Materials.HANDLE));

                let v = this.mPosition;
                this.object3D.position.set(v.x, v.y, v.z);
                this.object3D.scale.x = this.handleScale;
                this.object3D.scale.y = this.handleScale;
                this.object3D.scale.z = this.handleScale;
            }
            this.mScene.add(this.object3D);
        }

        // @Override Spot
        remove() {
            this.parent.removeVertex(this);
        }

        /**
         * Set the Z-ordinate of this vertex
         */
        setZ(z) {
            this.position.z = z;
        }

        // @Override Spot
        scheme() {
            let s = super.scheme();
            for (let i = 0; i < s.length; i++) {
                if (s[i].title === this.constructor.name) {
                    s[i].type = "label";
                    s[i].title = `${this.parent.name} vertex`;
                }
            }
            return s;
        }
    }

    /**
     * An open or closed path
     */
    class Path extends Container {

        constructor(name) {
            super(name);
            this.mIsClosed = false;
        }

        get Vertex() {
            return Path.Vertex;
        }
        
        addVertex(p) {
            let v = new this.Vertex(p);
            this.addChild(v);
            return v;
        }

        removeVertex(v) {
            if (this.mGeometry) {
                for (let i = 0; i < this.children.length; i++) {
                    if (this.children[i] === v) {
                        this.mGeometry.vertices.splice(i, 1);
                        this.mGeometry.verticesNeedUpdate = true;
                        break;
                    }
                }
            }
            this.removeChild(v);
        }
        
        get isClosed() {
            return this.mIsClosed;
        }
        
        close() {
            this.mIsClosed = true;
        }

        /**
         * @private
         * Find the index of the vertex on this edge that is first
         * in the path list
         */
        _findEdge(v1, v2) {
            if (v1.parent !== this || v2.parent !== this)
                throw new Error("Internal error");
            if (v1 === v2)
                return -1;
            for (let v = 0; v < this.children.length - 1; v++)
                if (this.children[v] === v1 && this.children[v + 1] === v2
                    || this.children[v] === v2 && this.children[v + 1] === v1)
                    return v;
            return -1;
        }
        
        // @Override Container
        hasEdge(v1, v2) {
            return this._findEdge(v1, v2) >= 0;
        }
        
        // @Override Container
        splitEdge(v1, v2) {
            let i = this._findEdge(v1, v2);
            let a = this.children[i];
            let b = this.children[i + 1];

            let v = new PathVertex(a.position.clone().lerp(b.position, 0.5));
            this.children.splice(i + 1, 0, v);
            if (this.mGeometry) {
                this.mGeometry.vertices.splice(i + 1, v.position);
                this.mGeometry.verticesNeedUpdate = true;
            }
        }
        
        // @Override Container
        addToScene(scene) {
            super.addToScene(scene);
            if (!this.mGeometry) {
                this.mGeometry = new Three.Geometry();
                for (let v of this.children) {
                    this.mGeometry.vertices.push(v.position);
                }
            }
            if (!this.mObject3D) {
                if (this.isClosed)
                    this.setObject3D(
                        new Three.LineLoop(this.mGeometry, Materials.EDGE));
                else
                    this.setObject3D(
                        new Three.Line(this.mGeometry, Materials.EDGE));
            }
            scene.add(this.mObject3D);
        }

        projectRay(ray, range2) {
            let best = super.projectRay(ray, range2);
            if (best)
                return best;
            let bestd2 = range2;
            let rayPt = new Three.Vector3();
            let edgePt = new Three.Vector3();
            let i, a;
            if (this.isClosed) {
                a = this.children[this.children.length - 1];
                i = 0;
            } else {
                a = this.children[0];
                i = 1;
            }
            for (; i < this.children.length; i++) {
                let b = this.children[i];
                let d2 = ray.distanceSqToSegment(
                    a.position, b.position, rayPt, edgePt);
                if (d2 < bestd2) {
                    bestd2 = d2;
                    best = {
                        closest: a,
                        closest2: b,
                        dist2: d2,
                        edgePt: edgePt.clone(),
                        rayPt: rayPt.clone()
                    };
                }
                a = b;
            }
                
            return best;
        }
    }

    Path.Vertex = PathVertex;
    
    return Path;
});
