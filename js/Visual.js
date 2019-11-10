define("js/Visual", ["three"], function(Three) {

    // Every Visual is uniquely numbered within this system
    let counter = 1;

    /**
     * Base class of elements in a scene. This is really little more
     * than an interface specification.
     */
    class Visual {

        /**
         * @param name may not be unique!
         */
        constructor(name) {
            this.mName = name;
            this.mUid = counter++;
            this.mScaleFactor = 1;
        }

        _notImplemented(method) {
            return new Error(this.constructor.name
                             + " has no implementation of " + method);
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

        get scale() {
            return this.mScaleFactor;
        }

        setScale(s) {
            this.mScaleFactor = s;
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
            throw this._notImplemented("scale");
        }

        /**
         * Get the volume the object occupies
         */
        get boundingBox() {
            throw this._notImplemented("get boundingBox");
        }
        
        /**
         * Apply a transform to the element
         */
        applyTransform(mat) {
            throw this._notImplemented("applyTransform");
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
        projectRay(ray) { return null; }

        /**
         * Get the Object3D used to display this edge
         */
        addToScene(scene) {
            throw this._notImplemented("addToScene");
        }

        /**
         * Used by Visuals that have a parent to remove themselves
         * from that parent
         */
        removeChild(child) {
            throw this._notImplemented("removeChild");
        }
        
        /**
         * Remove the element, and clean up the graph. Also remove it
         * from the scene graph, if it's there.
         */
        remove() {
            // Remove from parent
            if (this.mParent)
                this.mParent.removeChild(this);
        }

        /**
         * Note that edges don't have parents
         */
        get parent() {
            return this.mParent;
        }

        setParent(p) {
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
        highlight(on) { }

        /**
         * Generate a report on this object for use in the UI
         */
        get report() {
            let s = this.tag + " " + this.mUid;
            if (this.mName)
                s += " '" + this.mName + "'";
            return [ s ];
        }

        /**
         * Determine if this visual contains (or is) the given item
         * @param item Visual to test
         */
        contains(vis) {
            return (vis === this);
        }
    }
    return Visual;
});
