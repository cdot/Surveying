/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Path", ["js/Container", "three", "js/Spot", "js/Materials"], (Container, Three, Spot, Materials) => {

    class PathVertex extends Spot {
        
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

            if (!this.scene)
                return;

            // Once created, we keep the handle object around as it
            // will be useful again
            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                this.setObject3D(new Three.Sprite(Materials.HANDLE));

                let v = this.mPosition;
                this.object3D.position.set(v.x, v.y, v.z);
            }
            this.scene.add(this.object3D);
            this.resizeHandles();
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
            let scene = this.scene;
            if (scene)
                this.scene.remove(this.mObject3D);
            delete this.mObject3D;
            delete this.mGeometry;
            this.removeChild(v);
            if (scene)
                this.addToScene(scene);
        }
        
        get isClosed() {
            return this.mIsClosed;
        }
        
        close() {
            this.mIsClosed = true;
        }

        edgeMaterial() {
            return Materials.PATH;
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
            let c = this.children;
            let i1 = 0;
            let l = c.length;
            while (i1 < l) {
                let i2 = (i1 + 1) % l;
                if (i2 < i1 && !this.isClosed) break;
                if ((c[i1] === v1 && c[i2] === v2)
                    || (c[i1] === v2 && c[i2] === v1))
                    return i1;
                if (i2 === 0) break; // wrapped
                i1 = i2;
            }
            return -1;
        }
        
        // @Override Container
        hasEdge(v1, v2) {
            return this._findEdge(v1, v2) >= 0;
        }
        
        /**
         * Splits an edge in the visual.
         * @param {Spot} v1
         * @param {Spot} v2
         * @return {PathVertex} the midpoint vertex created
         */
        splitEdge(v1, v2) {
            let i1 = this._findEdge(v1, v2);
            if (i1 < 0)
                throw new Error("Can't split nonexistant edge");
            let i2 = (i1 + 1) % this.children.length;
            let a = this.children[i1];
            let b = this.children[i2];
            // Can't use addChild because it always adds to the end
            let scene = this.scene;
            if (scene)
                // DON'T remove the existing vertices, they host the
                // selection representation
                this.scene.remove(this.mObject3D);
            delete this.mObject3D;
            delete this.mGeometry;
            let vclass = this.Vertex;
            let v = new vclass(a.position.clone().lerp(b.position, 0.5));
            v.setParent(this);
            this.children.splice(i2, 0, v);
            if (scene)
                this.addToScene(scene);

            return v;
        }

        // @Override Container
        removeFromScene() {
            if (this.scene) {
                super.removeFromScene();
                this.scene.remove(this.mObject3D);
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
                        new Three.LineLoop(
                            this.mGeometry, this.edgeMaterial()));
                else
                    this.setObject3D(
                        new Three.Line(this.mGeometry, this.edgeMaterial()));
            }
            scene.add(this.mObject3D);
        }

        projectRay(ray, range2) {
            let best = super.projectRay(ray, range2);
            if (best || this.children.length < 2)
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
