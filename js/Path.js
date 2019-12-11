/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Path", ["js/Container", "three", "js/Point", "js/Materials"], function(Container, Three, Point, Materials) {

    /**
     * An open or closed path
     */
    class Path extends Container {

        // Embedded class Path.Vertex
        static get Vertex() {
            return class extends Point {

                // @Override Point
                addToScene(scene) {
                    // A vertex only has a visual representation when
                    // it is highlighted
                    this.mScene = scene;
                }

                // @Override Point
                setPosition(p) {
                    super.setPosition(p);
                    if (this.parent.mGeometry)
                        this.parent.mGeometry.verticesNeedUpdate = true;
                }
                
                // @Override Point
                highlight(on) {
                    if (!on) {
                        if (this.object3D && this.object3D.parent)
                            this.object3D.parent.remove(this.object3D);
                        return;
                    }

                    if (!this.mScene)
                        return;

                    if (!this.object3D) {
                        // Once created, we keep the handle object around as it
                        // will be useful again
                        super.addToScene(this.mScene);
                        super.highlight(on);
                    } else
                        this.mScene.add(this.object3D);
                }

                // @Override Point
                remove() {
                    this.parent.removeVertex(this);
                }
                
                setZ(z) {
                    this.position.z = z;
                }

                scheme() {
                    let s = super.scheme();
                    for (let i = 0; i < s.length; i++) {
                        if (s[i].title === this.constructor.name) {
                            s[i].type = "label";
                            s[i].title = this.parent.constructor.name + " vertex";
                        }
                    }
                    return s;
                }
            }
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
        }
        
        get isClosed() {
            return this.mIsClosed ? true : false;
        }
        
        close() {
            this.mIsClosed = true;
        }

        /**
         * @private
         * Find the index of the vertex on this edge that is first
         *  in the path list
         */
        _findEdge(v1, v2) {
            if (v1.parent !== this || v2.parent !== this)
                throw "Internal error";
            if (v1 === v2)
                return -1;
            for (let v = 0; v < this.children.length - 1; v++)
                if (this.children[v] === v1 && this.children[v + 1] === v2 ||
                    this.children[v] === v2 && this.children[v + 1] === v1)
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
                this.mGeometry,verticesNeedUpdate = true;
            }
        }
        
        // @Override Container
        addToScene(scene) {
            super.addToScene(scene);
            if (!this.mGeometry) {
                this.mGeometry = new Three.Geometry();
                for (let v of this.children)
                    this.mGeometry.vertices.push(v.position);
            }
            if (!this.mObject3D) {
                if (this.isClosed) 
                    this.setObject3D(new Three.LineLoop(this.mGeometry,
                                                        Materials.EDGE));
                else
                    this.setObject3D(new Three.Line(this.mGeometry,
                                                    Materials.EDGE));
            }
            scene.add(this.mObject3D);
        }
    }

    return Path;
});
