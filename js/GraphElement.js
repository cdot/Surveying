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
            throw "No implementation";
        }

        /**
         * Apply a transform to the element
         */
        applyTransform(mat) {
            throw "No implementation";
        }

        /**
         * See if the given ray "hits" this element
         * @return {
         *     Vertex closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} rayPt closest point on the ray
         * } or null if it's too far away
         */
        projectRay(ray) {
            throw "No implementation";
        }

        /**
         * Get the Object3D used to display this edge
         */
        addToScene(scene) {
            throw "No implementation";
        }

        /**
         * Remove the element, and clean up the graph. Also remove it from the scene
         * graph, if it's there.
         */
        remove() {
            throw "No implementation";
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
         * Make the DOM for saving in a survey
         */
        makeDOM(doc) {
            let el = doc.createElement(this.tag);
            if (this.nName)
                el.setAttribute("name", this.mName);
            el.setAttribute("id", this.mUid);
            return el;
        }
        
        /**
         * Highlight the network as being selected (or part of a selected
         * network)
         */
        highlight(on) {
            throw "No implementation";
        }

        report() {
            return this.tag + " " + this.mUid
            + (this.mName ? (" '" + this.name + "'") : "");
        }

    }
    return GraphElement;
});
