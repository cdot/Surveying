define("js/Visual", ["three"], function(Three) {

    // Every Visual is uniquely numbered within this system
    let counter = 1;

    /**
     * Base class of objects in a scene.
     */
    class Visual {

        /**
         * @param name may not be unique!
         */
        constructor(name) {
            this.mName = name;
            this.mUid = counter++;
            this.mHandleSize = 1;
        }

        _notImplemented(method) {
            return new Error(this.constructor.name
                             + " has no implementation of " + method);
        }
        
        /**
         * Get the name of this visual. Names are not necessarily unique.
         */
        get name() {
            return this.mName;
        }

        /**
         * Get the uid of this visual. Uids are always unique.
         * @return unique number identifying this visual
         */
        get uid() {
            return this.mUid;
        }

        /**
         * Get the handle size for visuals that
         * have handles in 3-space
         */
        get handleSize() {
            return this.mHandleSize;
        }

        /**
         * Get the square of the handle size for visuals that
         * have handles in 3-space
         */
        get handleSize2() {
            return this.mHandleSize2;
        }

        /**
         * Define the handle size for visuals that have handles in 3-space
         */
        setHandleSize(s) {
            this.mHandleSize = s;
            this.mHandleSize2 = s * s;
        }

        /**
         * Get the volume the object occupies
         */
        get boundingBox() {
            throw this._notImplemented("get boundingBox");
        }
        
        /**
         * Apply a transform to the visual
         */
        applyTransform(mat) {
            throw this._notImplemented("applyTransform");
        }

        /**
         * See if the given ray "hits" this visual
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
         * Remove the visual, and clean up the database.
         */
        remove() {
            // Remove from parent
            if (this.mParent)
                this.mParent.removeChild(this);
        }

        /**
         * Get the parent visual that contains this visual
         */
        get parent() {
            return this.mParent;
        }

        /**
         * Set the parent visual that contains this visual
         */
        setParent(p) {
            this.mParent = p;
        }
        
        /**
         * Get the child before this in the parent
         */
        get prev() {
            if (!this.mParent)
                return null;
            return this.mParent.prevChild(this);
        }
        
        /**
         * Get the child after htis in the parent
         */
        get next() {
            if (!this.mParent)
                return null;
            return this.mParent.nextChild(this);
        }
        
        /**
         * Highlight the object as being selected (or part of a selection)
         */
        highlight(on) { }

        /**
         * Generate a report on this object for use in the UI
         */
        get report() {
            let s = this.constructor.name + " " + this.mUid;
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
