/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Visual", ["three"], function(Three) {

    /**
     * Base class of objects in a scene.
     */
    class Visual {

        /**
         * @param name may not be unique!
         */
        constructor(name) {
            if (name)
                this.mName = name;
            this.mHandleScale = 1;
            this.mProp = {};
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
         * Get the handle size for visuals that
         * have handles in 3-space
         */
        get handleScale() {
            return this.mHandleScale;
        }

        /**
         * Get the square of the handle scale for visuals that
         * have handles in 3-space
         */
        get handleScale2() {
            return this.mHandleScale2;
        }

        /**
         * Define the handle size for visuals that have handles in 3-space
         */
        setHandleScale(s) {
            this.mHandleScale = s;
            this.mHandleScale2 = s * s;
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
         * @param {Line3} ray
         * @param range2 square of maximum range
         * @return {
         *     Point closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} edgePt closest point on the ray, if edge hit
         * } or null if it's outside range2
         */
        projectRay(ray, range2) { return null; }

        /**
         * Get the Object3D used to display this Visual
         */
        get object3D() {
            return this.mObject3D;
        }

        /**
         * Set the Object3D used to display this Visual
         */
        setObject3D(o3d) {
            o3d.userData.visual = this;
            this.mObject3D = o3d;
        }
        
        /**
         * Add the Object3D used to display this Visual to the scene
         */
        addToScene(scene) {
        }

        /**
         * Remove the Object3D associated with this visual from the scene.
         * The object is NOT deleted, just removed from the parent, and the
         * link between the Three.Object and the Visual is retained.
         */
        removeFromScene() {
            if (this.mObject3D && this.mObject3D.parent)
                this.mObject3D.parent.remove(this.mObject3D);
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
        scheme() {
            return [{
                title: this.constructor.name,
                type: "string",
                get: () => { return this.mName || ""; },
                set: (v) => { this.mName = v; }
            }];
        }

        /**
         * Determine if this visual contains (or is) the given item
         * @param item Visual to test
         */
        contains(vis) {
            return (vis === this);
        }

        /**
         * Add the points in visuals that have the properties
         * type:contour or type:point to a flat array suitable for
         * passing to delaunator, with a map back to the actual Point
         * object.
         * @param coords array of [x0, y0, x1, y1, ...] 
         * @param mapBack array indexed by the index into coords/2, mapping
         * to the visual object.
         */
        condense(coords, mapBack) {
        }
    }
    return Visual;
});
