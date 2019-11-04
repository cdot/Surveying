define("js/Network", ["three", "js/Vertex", "js/Edge"], function(Three, Vertex, Edge) {

    /**
     * A network of interconnected vertices (Vertex) joined by edges (Edge)
     */
    class Network {

        /**
         * @param id network id
         */
        constructor(id) {
            this.mId = id;
            this.mSubnets = [];
            this.mVertices = [];
            this.mEdges = [];
        }

        get id() {
            return this.mId;
        }

        get tag() {
            return "network";
        }
        
        addEdge(e) {
            e.parent = this;
            this.mEdges.push(e);
            return e;
        }
       
        /**
         * Add a vertex to this network
         */
        addVertex(v) {
            v.parent = this;
            this.mVertices.push(v);
        }

        /**
         * Add a subnetwork to this network
         */
        addSubnet(g) {
            g.parent = this;
            this.mSubnets.push(g);
        }

        /**
         * Add the Three.Object3D representation of the vertices of this network
         * to the given scene
         */
        addToScene(scene) {
            // Add vertex markers
            for (let v of this.mVertices)
                v.addToScene(scene);
            // Add edge lines
            for (let e of this.mEdges)
                e.addToScene(scene);
        }

        /**
         * Scale the spots used to mark vertices
         */
        scale(s) {
            for (let g of this.mSubnets)
                g.scale(s);
            for (let v of this.mVertices)
                v.scale(s);
            for (let e of this.mEdges)
                e.scale(s);
        }

        // Private, purge dead networks
        _purge() {
            if (this.mVertices.length === 0 && this.mSubnets.length === 0)
                this.parent.remove(this);
        }

        /**
         * Remove the Three.Object3D representation
         * from the given scene
         */
        removeFromScene(scene) {
            for (let v of this.mVertices)
                v.removeFromScene(scene);
            for (let e of this.mEdges)
                e.removeFromScene(scene);
            return el;
        }

        remove(item) {
            let removed = false;
            if (item instanceof Vertex) {
                for (let i = 0; i < this.mVertices.length; i++) {
                    if (item === this.mVertices[i]) {
                        this.mVertices.splice(i, 1);
                        console.log("Removed vertex", item.mId);
                        debugger;
                        // Remove edges that terminate on this vertex
                        for (let i = this.mEdges.length - 1; i >= 0; ) {
                            let e = this.mEdges[i];
                            if (e.p1 === item || e.p2 === item)
                                this.mEdges.splice(i, 1);
                            else
                                i--;
                        }
                        removed = true;
                        break;
                    }
                }                
            } else if (item instanceof Network) {
                for (let i = 0; i < this.mSubnets.length; i++) {
                    if (item === this.mSubnets[i]) {
                        this.mSubnets.splice(i, 1);
                        console.log("Removed network", this.mId);
                        removed = true;
                        break;
                    }
                }
            }

            // Not in this net, remove from subnets
            for (let sn of this.mSubnets) {
                if (sn.remove(item)) {
                    removed = true;
                    break;
                }
            }

            if (removed)
                this._purge();

            return removed;
        }

        /**
         * A vertex can only be in one Network
         */
        removeVertex(rv) {
            

            if (removed)
                this._purge();

            return removed;
        }

        /**
         * Apply a transform to all vertices in the network
         */
        applyTransform(mat) {
           for (let g of this.mSubnets)
                g.applyTransform(mat);
            for (let v of this.mVertices)
                v.applyTransform(mat);
        }
        
        /* keeping for reference
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
        }*/

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
            for (let g of this.mSubnets) {
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
         * Get the vertex or edge closest to the given ray
         * @return {
         *     {Vertex|Edge} closest: closest Vertex or Edge
         *     {double} dist2: square of dist from closest to ray
         *     {Three.Vector3} edgePt closest point on the ray, if edge hit
         *     {Three.Vector3} rayPt closest point on the ray
         * }
         */
        projectRay(ray) {
            let best;

            // First check sub-networks
            for (let g of this.mSubnets) {
                let d = g.projectRay(ray);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            // Check vertices not in a sub-network.
            for (let p of this.mVertices) {
                let d = p.projectRay(ray);
                                
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            // Check edges
            for (let e of this.mEdges) {
                let d = e.projectRay(ray);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            return best;
        }

        highlight(tf) {
            for (let p of this.mVertices)
                p.highlight(tf);
        }

        /**
         * Determine if this network contains the given item
         * @param item Vertex or Network to test
         */
        contains(item) {
            if (item instanceof Vertex)
                for (let v of this.mVertices)
                    if (item === v)
                        return true;

            for (let g of this.mSubnets) {
                if (item === g)
                    return true;
                if (g.contains(item))
                    return true;
            }

            return false;
        }

        makeDOM(doc) {
            let el = doc.createElement(this.tag);
            el.setAttribute("id", this.id);
            for (let g of this.mSubnets)
                el.appendChild(g.makeDOM(doc));
            for (let v of this.mVertices)
                el.appendChild(v.makeDOM(doc));
            for (let e of this.mEdges)
                el.appendChild(e.makeDOM(doc));
            return el;
        }
    }
    return Network;
});
