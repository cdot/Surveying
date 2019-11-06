define("js/GraphContainer", ["three", "js/GraphElement"], function(Three, GraphElement) {

    /**
     * A graphical object that can contain other objects
     */
    class GraphContainer extends GraphElement {
        
        constructor(name) {
            super(name);
            this.mObjects = [];
        }
        
        get tag() { return "container"; }
        
        /**
         * Add a subnetwork to this network
         */
        addObject(g) {
            g.parent = this;
            this.mObjects.push(g);
        }
        
        /**
         * Add the Three.Object3D representation of the vertices and
         * edges of this network to the given scene
         */
        // @Override
        addToScene(scene) {
            for (let o of this.mObjects)
                o.addToScene(scene);
        }
        
        /**
         * Scale the spots used to mark vertices
         */
        // @Override
        scale(s) {
            for (let g of this.mObjects)
                g.scale(s);
        }
        
        /**
         * Remove an object
         */
        remove() {
            let contents = this.mObjects.slice();
            for (let thing of contents)
                this.remove();
            if (this.parent)
                this.parent.removeChild(this);
        }
        
        removeChild(item) {
            let i = this.mObjects.indexOf(item);
            if (i < 0)
                throw new Error("Cannot remove missing child");
            this.mObjects.splice(i, 1);
        }
        
        // @Override GraphElement
        applyTransform(mat) {
            for (let g of this.mObjects)
                g.applyTransform(mat);
        }
        
        // @Override GraphElement
         get boundingBox() {
            let bb = new Three.Box3();
            for (let g of this.mObjects) {
                let gbb = g.boundingBox;
                bb.expandByPoint(gbb.min);
                bb.expandByPoint(gbb.max);
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
        // @Override
        projectRay(ray) {
            let best;

            for (let g of this.mObjects) {
                let d = g.projectRay(ray);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            return best;
        }

                /**
         * Highlight the network as being selected
         */
        // @Override
        highlight(tf) {
            for (let g of this.mObjects)
                g.highlight(tf);
        }

        /**
         * Determine if this network contains the given item
         * @param item Vertex or Network to test
         */
        contains(item) {
            if (this.mObjects.indexOf(item) >= 0)
                return true;
            for (let g of this.mObjects) {
                if (g.contains(item))
                    return true;
            }
        }

    /**
     * Make the DOM for saving in a .survey document
     */
        // @Override
        makeDOM(doc) {
            let el = super.makeDOM(doc);
            for (let g of this.mObjects)
                el.appendChild(g.makeDOM(doc));
            return el;
        }
        
        // @Override
        report() {
            let s = super.report();
            if (this.mObjects.length > 0)
                s.push(this.mObjects.length + " sub-objects"
                       + this.mObjects.length == 1 ? "" : "s");
        }
    }

    return GraphContainer;
});
