define("js/Vertex", ["three", "js/GraphElement"], function(Three, GraphElement) {

    const HIGHLIGHT = new Three.MeshBasicMaterial({color: 0xFF0000});
    const NORMAL = new Three.MeshBasicMaterial({color: 0x0000FF});
    
    /**
     * A vertex in a network.
     */
    class Vertex extends GraphElement {
        /**
         * @param name vertex name (may not be unique)
         * @param v Three.Vector3 position of vertex
         */
        constructor(name, v) {
            super(name);
            this.mCurPos = new Three.Vector3(v.x, v.y, v.z);
            this.mEdges = []; // not OWNED by Vertex, just referred to
        }

        // @Override
        get tag() { return "node"; }
 
        /**
         * @return Three.Vector3 current position of vertex
         */
        get current() {
            return this.mCurPos;
        }
        
        /**
         * Make the DOM for saving in a .survey document
         */
        // @Override
        makeDOM(doc) {
            let el = super.makeDOM(doc);
            el.setAttribute("x", this.mCurPos.x);
            el.setAttribute("y", this.mCurPos.y);
            el.setAttribute("z", this.mCurPos.z);
            return el;
        }
        
        /**
         * Add a reference to an edge that ends on this vertex
         */
        addEdge(e) {
            this.mEdges.push(e);
        }

        /**
         * Remove a reference to an edge, if it's there
         */
        removeEdge(e) {
            let i = this.mEdges.indexOf(e);
            if (i >= 0)
                this.mEdges.splice(i, 1);
        }
        
        // @Override
        applyTransform(mat) {
            let p = this.mCurPos.clone();
            if (mat instanceof Three.Matrix3) {
                // 2D transform
                let e = mat.elements;
                let x = p.x, y = p.y;
                p.x = x * e[0] + y * e[3] + e[6];
                p.y = x * e[1] + y * e[4] + e[7];
            } else
                p.applyMatrix4(mat);
            
            this.current = p;
        }
        
        // @Override
        scale(s) {
            this.mObject3D.scale.x = s;
            this.mObject3D.scale.y = s;
            this.mObject3D.scale.z = s;
            // Closeness for click test
            this.mDot2 = 4 * s * s;
        }
        
       /**
         * Add the Three.Object3D representation of this vertex
         * to the given scene
         */
        // @Override
        addToScene(scene) {
            this.mGeometry = new Three.BoxGeometry(1, 1, 1);
            this.mObject3D = new Three.Mesh(this.mGeometry, NORMAL);
            let v = this.mCurPos;
            this.mObject3D.position.set(v.x, v.y, v.z);
            scene.add(this.mObject3D);
        }

        /**
         * Remove this vertex from the network tree (and the scene graph,
         * if it's there)
         */
        // @Override
        remove() {
            // When we remove edges, the edges are removed from the endpoints, of which
            // we are one. So copy the edges to make sure we don't strangle the iteration.
            let deadges = this.mEdges.slice();
            for (let e of deadges) {
                this.parent._removeEdge(e);
                e.remove();
            }
            if (this.mEdges.length > 0)
                console.debug("Suspicious that edges are left", this.mEdges);
            this.mEdges = [];

            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
            }

            // Tell the container to remove us.
            this.parent._removeVertex(this);
        }

        /**
         * See if the given ray "hits" this vertex
         * @return {
         *     Vertex closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} rayPt closest point on the ray
         * } or null if it's too far away
         */
        // @Override
        projectRay(ray) {
            let np = new Three.Vector3();
            ray.closestPointToPoint(this.mCurPos, false, np);
            let dist2 = np.clone().sub(this.mCurPos).lengthSq();
            if (dist2 > this.mDot2)
                return null;
            return {
                closest: this,
                dist2: dist2,
                rayPt: np.clone()
            };
        }
        
        /*
         * @param v Three.Vector3 set current position of vertex
         */
        set current(v) {
            this.mCurPos.copy(v);
            if (this.mObject3D)
                this.mObject3D.position.set(v.x, v.y, v.z);
            for (let e of this.mEdges)
                e.vertexMoved();
        }

        /**
         * Highlight the network as being selected (or part of a selected
         * network)
         */
        // @Override
        highlight(on) {
            if (this.mObject3D)
                this.mObject3D.material = on ? HIGHLIGHT : NORMAL;
        }

        // @Override
        report() {
            let s = super.report()
                + " (" + this.mCurPos.x + "," + this.mCurPos.y + "," + this.mCurPos.z + ")";
            for (let e of this.mEdges)
                s += " " + e.otherEnd(this).uid;
            return s;
        }
    }
    return Vertex;
});

