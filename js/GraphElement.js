define("js/GraphElement", ["three"], function(Three) {

    // Every GraphElement is uniquely numbered within this system
    let counter = 1;

    /**
     * Base class of elements in a scene. This is really little more than an interface
     * specification.
     */
    class GraphElement {

        /**
         * @param name may not be unique!
         */
        constructor(name) {
            this.mName = name;
            this.mUid = counter++;
        }

        /**
         * Get the name of this element. Names are not necessarily unique.
         */
        get name() {
            return this.mName;
        }

        /**
         * Get the uid of this element. Uids are always unique.
         * @return unique number identifying this element
         */
        get uid() {
            return this.mUid;
        }

         /**
         * Get the tag for this element used when creating a survey dom
         */
        get tag() { return "element"; }
        
        /**
         * Scale the geometry of the element appropriately so that it appears
         * the right size in the scene
         */
        scale(s) {
            throw new Error(this.constructor.name + ": No implementation of scale");
        }

        /**
         * Get the volume the object occupies
         */
        get boundingBox() {
            throw new Error(this.constructor.name + ": No implementation of get boundingBox");
        }
        
        /**
         * Apply a transform to the element
         */
        applyTransform(mat) {
            throw new Error(this.constructor.name + ": No implementation of applyTransform");
        }

        /**
         * See if the given ray "hits" this element
         * @return {
         *     Vertex closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} edgePt closest point on the ray, if edge hit
         *     {Three.Vector3} rayPt closest point on the ray
         * } or null if it's too far away
         */
        projectRay(ray) {
            throw new Error(this.constructor.name + ": No implementation of projectRay");
        }

        // Helper for subclasses
        applyMatrix(mat, p) {
            if (mat instanceof Three.Matrix3) {
                // 2D transform
                let e = mat.elements;
                let x = p.x, y = p.y;
                p.x = x * e[0] + y * e[3] + e[6];
                p.y = x * e[1] + y * e[4] + e[7];
            } else
                p.applyMatrix4(mat);
            return p;
        }

        /**
         * Get the Object3D used to display this edge
         */
        addToScene(scene) {
            throw new Error(this.constructor.name + ": No implementation of addToScene");
        }

        /**
         * Remove the element, and clean up the graph. Also remove it from the scene
         * graph, if it's there.
         */
        remove() {
            throw new Error(this.constructor.name + ": No implementation of remove");
        }

        /**
         * Note that edges don't have parents
         */
        get parent() {
            return this.mParent;
        }

        set parent(p) {
            this.mParent = p;
        }
        
        /**
         * Make the DOM for saving in a .survey document
         */
        makeDOM(doc) {
            let el = doc.createElement(this.tag);
            if (this.nName)
                el.setAttribute("name", this.mName);
            el.setAttribute("id", this.mUid);
            return el;
        }
        
        /**
         * Highlight the object as being selected (or part of a selection)
         */
        highlight(on) {
            throw new Error(this.constructor.name + ": No implementation of highlight");
        }

        /**
         * Generate a report on this object for use in the UI
         */
        report() {
            let s =  [ this.tag + " " + this.mUid ];
            if (this.mName)
                s.push("'" + this.name + "'");
            return s;
        }

    }
    return GraphElement;
});
