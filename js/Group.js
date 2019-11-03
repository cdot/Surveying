define("js/Group", ["three", "js/Vertex", "js/Draggable"], function(Three, Vertex, Draggable) {

    /**
     * A cloud of points (of type Vertex) with no specific relationship between them
     */
    class Group extends Draggable {
        constructor(id) {
            super();
            this.mId = id;
            this.mGroups = []; // subgroups
            this.mVertices = []; // vertices
        }

        get id() {
            return this.mId;
        }
        
        /**
         * Add a vertex to this group
         */
        addVertex(v) {
            v.parent = this;
            this.mVertices.push(v);
        }

        /**
         * Add a subgroup to this group
         */
        addGroup(g) {
            g.parent = this;
            this.mGroups.push(g);
        }

        /**
         * Add the Three.Object3D representation of the vertices of this group
         * to the given scene
         */
        addToScene(scene) {
            for (let v of this.mVertices)
                v.addToScene(scene);
        }

        /**
         * Scale the spots used to mark vertices
         */
        scale(s) {
            for (let g of this.mGroups)
                g.scale(s);
            for (let v of this.mVertices)
                v.scale(s);
        }
        
        /**
         * Remove the Three.Object3D representation of the vertices of this group
         * from the given scene
         */
        removeFromScene(scene) {
            for (let v of this.mVertices)
                v.removeFromScene(scene);
        }

        // Private, purge dead groups
        _purge() {
            if (this.mVertices.length === 0
                && this.mGroups.length === 0)
                this.parent.removeGroup(this);
        }

        /**
         * A vertex can only be in one Group, but it may be in a sub-group
         */
        removeVertex(rv) {
            for (let i = 0; i < this.mVertices.length; i++) {
                if (rv === this.mVertices[i]) {
                    this.mVertices.splice(i, 1);
                    break;
                }
            }
            for (let g of this.mGroups)
                g.removeVertex(rv);

            console.log("Removed vertex", rv.mId);
            this._purge();
        }

        removeGroup(g) {
            for (let i = 0; i < this.mGroups.length; i++) {
                if (rv === this.mGroups[i]) {
                    this.mGroups.splice(i, 1);
                    return;
                }
            }
            console.log("Removed group", this.mId);
            this._purge();
        }

        applyTransform(mat) {
           for (let g of this.mGroups)
                g.applyTransform(mat);
            for (let v of this.mVertices)
                v.applyTransform(mat);
        }
        
        /**
         * @Override Draggable
         */
        dragTo(v) {
            let delta = v.clone().sub(this.referenceVertex.current);
            for (let v of this.mVertices) {
                v.dragTo(v.current.clone().add(delta));
            }
        }

        rotate(reference, angle) {
            let mat1 = new Three.Matrix4().makeTranslation(
                -reference.x, -reference.y, 0);
            let mat2 = new Three.Matrix4().makeRotationZ(angle);
            let mat3 = new Three.Matrix4().makeTranslation(
                reference.x, reference.y, 0);
            for (let v of this.mVertices) {
                let p = v.current;
                p.applyMatrix4(mat1);
                p.applyMatrix4(mat2);
                p.applyMatrix4(mat3);
                v.current = p;
            }            
        }

        get boundingBox() {
            function extendP(bb, pt) {
                bb.min.x = Math.min(bb.min.x, pt.x);
                bb.max.x = Math.max(bb.max.x, pt.x);
                bb.min.y = Math.min(bb.min.y, pt.y);
                bb.max.y = Math.max(bb.max.y, pt.y);
                bb.min.z = Math.min(bb.min.z, pt.z);
                bb.max.z = Math.max(bb.max.z, pt.z);
            }

            function extendBB(bb, obb) {
                extendP(bb, obb.min);
                extendP(bb, obb.max);
            }
            
            let bb;
            for (let g of this.mGroups) {
                let gbb = g.boundingBox;
                if (gbb) {
                    if (!bb)
                        bb = gbb;
                    else
                        extendBB(bb, gbb);
                }
            }
            
            for (let vx of this.mVertices) {
                let v = vx.current;
                if (!bb)
                    bb = {min: {x : v.x, y: v.y, z: v.z},
                          max: {x : v.x, y: v.y, z: v.z}};
                else
                    extendP(bb, v);
            }
            
            return bb;
        }

        /**
         * Get the draggable object (vertex or sub-group) closest to
         * the given ray.
         * @return {
         *     double minDist2 (square of dist to ray)
         *     Vertex vertex (closest vertex)
         *     Object draggable (either a Vertex or a Group if the vertex
         *     is in a subgroup)
         *     Three.Vector3 rayPt (closest point)
         * }
         */
        getClosestDraggable(ray) {
            let best;

            // First check sub-groups
            for (let g of this.mGroups) {
                let d = g.getClosestDraggable(ray);
                if (d && (!best || d.minDist2 < best.minDist2)) {
                    d.draggable = g;
                    best = d;
                }
            }

            // Check vertices not in a sub-group.
            for (let p of this.mVertices) {
                let np = new Three.Vector3();
                ray.closestPointToPoint(p.current, false, np);
                let dist2 = np.clone().sub(p.current).lengthSq();
                                
                if (!best || dist2 < best.minDist2) {
                    this.referenceVertex = p;
                    best = {
                        minDist2: dist2,
                        vertex: p,
                        draggable: p,
                        rayPt: np.clone()
                    };
                }
            }
            
            return best;
        }
    }
    
    return Group;
});
