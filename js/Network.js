define("js/Network", ["js/Container", "js/Visual", "js/Point", "js/Materials", "delaunator"], function(Container, Visual, Point, Materials, Delaunator) {

    // Every NVertex is uniquely numbered within this system
    let counter = 1;

    /**
     * @private
     * A vertex in a Network. A NVertex is a Point with a set of incident
     * edges and slightly different highlighting behaviours.
     */
    class NVertex extends Point {
        /**
         * @param name vertex name (may not be unique)
         * @param v Three.Vector3 position of vertex or x, y, z
         */
        constructor(p) {
            super(p);
            this.mVid = counter++;
            // NEdges are not OWNED by NVertex, just referred to. They
            // are owned by the parent Network.
            this.mEdges = [];
        }

        /**
         * Get the unique identifier of this vertex.
         * Vids are allocated when scenes are loaded.
         * @return unique number identifying this vertex
         */
        get vid() {
            return this.mVid;
        }

        /**
         * Add a reference to an edge that ends on this vertex
         */
        addEdge(e) {
            this.mEdges.push(e);
        }

        get edges() {
            return this.mEdges;
        }
        
        /**
         * Remove a reference to an edge, if it's there
         */
        removeEdge(e) {
            let i = this.mEdges.indexOf(e);
            if (i >= 0)
                this.mEdges.splice(i, 1);
        }
        
        // @Override Point
        addToScene(scene) {
            // A vertex only has a visual representation when
            // it is highlighted
            this.mScene = scene;
        }

        // @Override Point
        remove() {
            let es = this.mEdges.slice();
            if (es.length === 2) {
                let p0 = es[0].otherEnd(this);
                let p1 = es[1].otherEnd(this);
                let nedge = this.parent.addEdge(p0, p1);
                if (this.object3D)
                    nedge.addToScene(this.object3D.parent);
            }
            for (let e of es)
                e.remove();
            
            this.mEdges = [];

            super.remove();
        }

        // @Override Point
        setPosition(p) {
            super.setPosition(p);
            for (let e of this.mEdges)
                e.vertexMoved();
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
        scheme(skip) {
            let s = super.scheme(skip + "'name'");
            s.push("NVertex #" + this.mVid);
            for (let e of this.mEdges)
                s.push("\tedge to #" + e.otherEnd(this).vid);
            return s;
        }

        condense(coords, mapBack) {
        }
    }

    /**
     * @private
     * An edge in a Network. Note that edges are Visuals but do
     * not participate in the general object hierarchy; instead they
     * are stored local to Network, and referenced in NVertex.
     */
    class NEdge extends Visual {
        /**
         * @param p1 NVertex
         * @param p2 NVertex
         */
        constructor(p1, p2) {
            super(); // edges have no name
            this.mP1 = p1;
            p1.addEdge(this);
            this.mP2 = p2;
            p2.addEdge(this);
        }

        get p1() { return this.mP1; }

        get p2() { return this.mP2; }

        /**
         * Given an end of this edge, get the other end
         */
        otherEnd(v) {
            if (v === this.mP1)
                return this.mP2;
            if (v === this.mP2)
                return this.mP1;
            return null;
        }
        
        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mP1.position);
            bb.expandByPoint(this.mP2.position);
            return bb;
        }

        // @Override Visual
        addToScene(scene) {
            if (!this.mObject3D) {
                this.mGeometry = new Three.Geometry();
                this.mGeometry.vertices.push(this.mP1.position);
                this.mGeometry.vertices.push(this.mP2.position);
                this.setObject3D(new Three.Line(this.mGeometry, Materials.EDGE));
            }
            scene.add(this.object3D);
        }

        // @Override Visual
        removeFromScene() {
            super.removeFromScene();           
        }
        
        // @Override Visual
        remove() {
            this.mP1.removeEdge(this);
            this.mP2.removeEdge(this);
            this.parent.removeEdge(this);
            this.removeFromScene();
        }

        /**
         * Called from NVertex when a vertex on this edge moves
         */
        vertexMoved() {
            if (this.mGeometry)
                this.mGeometry.verticesNeedUpdate = true;
        }

        // @Override Visual
        highlight(on) {
            if (this.object3D) {
                this.object3D.material =
                (on ? Materials.EDGE_SELECTED : Materials.EDGE);
            }
        }

        // @Override Visual
        projectRay(ray) {
            // TODO:
            return null;
        }
    }

    /**
     * A network of interconnected vertices (NVertex) joined by edges (NEdge)
     * A network can be a simple path, or could be a mesh.
     */
    class Network extends Container {

        /**
         * @param name network name
         */
        constructor(name) {
            super(name);
            this.mEdges = [];
        }

        /**
         * Add a vertex at the given point
         * @return {NVertex} added
         */
        addVertex(p) {
            let v = new NVertex(p);
            this.addChild(v);
            return v;
        }
        
        /**
         * Add an edge to the network. The edge must refer to vertices
         * in the network (not in subnets). Two signatures,
         * @param {NVertex} p1 first vertex
         * @param {NVertex} p2 sceond vertex
         */
        addEdge(p1, p2) {
            let e = new NEdge(p1, p2);
            e.setParent(this);
            this.mEdges.push(e);
            return e;
        }

        /**
         * Split the given edge and add a new vertex at the midpoint
         */
        splitEdge(e) {
            // Don't use addVertex because subclasses may have overridden it.
            // Instead splice the new vertex in after the first of the endpoints
            // encountered in children
            let a = e.p1;
            let b = e.p2;

            let v = new NVertex(a.position.clone().lerp(b.position, 0.5));
            for (let i in this.children) {
                let c = this.children[i];
                if (c === a || c === b) {
                    this.children.splice(i + 1, 0, v);
                    break;
                }
            }
            let e1 = this.addEdge(a, v);
            let e2 = this.addEdge(v, b);
            if (e.object3D) {
                e1.addToScene(e.object3D.parent);
                e2.addToScene(e.object3D.parent);
                v.addToScene(e.object3D.parent);
            }
            this.removeEdge(e);
            return v;
        }

        /**
         * Get the edges in the network
         */
        get edges() {
            return this.mEdges;
        }
        
        // @Override Container
        addToScene(scene) {
            super.addToScene(scene);
            // Add edge lines
            for (let e of this.mEdges)
                e.addToScene(scene);
        }

        // @Override Container
        removeFromScene() {
            super.removeFromScene();
            for (let e of this.mEdges)
                e.removeFromScene(scene);
        }

        // @Override Container
        setHandleScale(s) {
            super.setHandleScale(s);
            for (let e of this.mEdges)
                e.setHandleScale(s);
        }

        // @Override Container
        remove() {
            let es = this.mEdges.slice();
            for (let e of es)
                e.remove();
            super.remove();
        }

        /**
         * Remove the given edge from our edge list
         */
        removeEdge(e) {
            e.removeFromScene();
            let i = this.mEdges.indexOf(e);
            if (i >= 0)
                this.mEdges.splice(i, 1);
        }
        
        // @Override Container
        projectRay(ray) {
            let best = super.projectRay(ray);

            // Check edges
            for (let e of this.mEdges) {
                let d = e.projectRay(ray);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            return best;
        }

        // @Override Container
        highlight(tf) {
            super.highlight(tf);
            for (let e of this.mEdges)
                e.highlight(tf);
        }

        // @Override Container
        scheme(skip) {
            let s = super.scheme(skip);
            if (this.mEdges.length > 0 && !/'counts'/.test(skip))
                s.push(this.mEdges.length + " edge"
                       + (this.mEdges.length == 1 ? "" : "s"));
            return s;
        }

        /**
         * Construct a new Network object that contains a Delaunay
         * triangulation of all the Point objects in the container
         * @param a Visual to recursively meshify
         * @return the resulting network
         */
        static meshify(visual) {
            function nextHalfedge(e) {
                return (e % 3 === 2) ? e - 2 : e + 1;
            }

            // Condense Contours and Points into a cloud of points
            let coords = [];
            let mapBack = [];
            visual.condense(coords, mapBack);

            let del = Delaunator.from(coords);
            let result = new Network("Triangulation");

            // Construct a mesh, adding condensed points back in as vertices
            for (let i in mapBack) {
                let c = mapBack[i];
                let p = c.position;
                mapBack[i] = c = result.addVertex(c);
            }
            
            // Iterate over the forward edges
            for (let e = 0; e < del.triangles.length; e++) {
                if (e > del.halfedges[e]) {
                    // Not a back-edge
                    let p = mapBack[del.triangles[e]];
                    let q = mapBack[del.triangles[nextHalfedge(e)]];
                    if (!p || !q) debugger;
                    result.addEdge(p, q);
                }
            }
            return result;
        }
    }
    return Network;
});
