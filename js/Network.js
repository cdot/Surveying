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

        /**
         * Get the id for the network
         */
        get id() {
            return this.mId;
        }

        /**
         * Get the tag for this object used when creating a survey dom
         */
        get tag() {
            return "network";
        }

        /**
         * Add an edge to the network. The edge must refer to vertices
         * in the network (not in subnets)
         */
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
         * Add the Three.Object3D representation of the vertices and
         * edges of this network to the given scene
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

        /**
         * Remove this network if it has no vertices or subnets
         * INTERNAL USE ONLY
         */
        _purge() {
            if (this.mVertices.length === 0 && this.mSubnets.length === 0)
                this.parent._removeSubnet(this);
        }

        /**
         * Remove a Vertex from this network
         * INTERNAL USE ONLY
         */
        _removeVertex(item) {
            let i = this.mVertices.indexOf(item);
            if (i < 0)
                throw new Error("Tried to remove missing vertex");
            this.mVertices.splice(i, 1);

            this._purge();
        }

        /**
         * Remove a Subnet from this network
         * INTERNAL USE ONLY
         */
        _removeSubnet(item) {
            let i = this.mSubnets.indexOf(item);
            if (i < 0)
                throw new Error("Tried to remove missing subnet");
            this.mSubnets.splice(i, 1);

            this._purge();
        }

        /**
         * Remove a Subnet from this network
         * INTERNAL USE ONLY
         */
        _removeEdge(e) {
            let i = this.mEdges.indexOf(e);
            if (i < 0)
                throw new Error("Tried to remove missing edge");
            this.mEdges.splice(i, 1);
        }
        
        /**
         * Remove this network from the network tree (and the scene graph,
         * if it's there)
         */
        remove() {
            for (let v of this.mVertices)
                v.remove();
            for (let n of this.mSubnets)
                n.remove();

            // Tell the container to remove us
            this.parent._removeSubnet(this);
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

        /**
         * Get the volume the network occupies
         */
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
         * @param {Three.Line3} ray 
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

        /**
         * Highlight the network as being selected
         */
        highlight(tf) {
            for (let p of this.mVertices)
                p.highlight(tf);
            for (let e of this.mEdges)
                e.highlight(tf);
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

        /**
         * Make the DOM for saving in a .survey document
         */
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

        report() {
            return "Network '" + this.mId + "' "
            + this.mSubnets.length + " subnets "
            + this.mVertices.length + " vertices "
            + this.mEdges.length + " edges ";
        }
    }
    return Network;
});
