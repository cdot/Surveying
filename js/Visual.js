define("js/Visual", ["three"], function(Three) {

    /**
     * Base class of objects in a scene.
     */
    class Visual {

        /**
         * @param name may not be unique!
         */
        constructor(name) {
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
         * All visuals can carry any number of arbitrary properties.
         * Two signatures: prop(k) get the value of the property and
         * prop(k, v) set the value of the property.
         */
        prop(k, v) {
            if (typeof v !== "undefined")
                this.mProp[k] = v;
            return this.mProp[k];
        }

        /**
         * Get a list of the properties defined on this visual
         */
        get props() {
            if (this.mProp.keys)
                return this.mProp.keys();
            let ks = [];
            for (let k in this.mProp)
                ks.push(k);
            return ks;
        }
        
        /**
         * Remove the given property. If the property isn't present,
         * does nothing. Note that subclasses may define properties that
         * can't be removed (such as "type")
         */
        removeProp(k) {
            delete this.mProp[k];
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
         * @return {
         *     Vertex closest: this
         *     {double} dist2: square of dist from ray
         *     {Three.Vector3} edgePt closest point on the ray, if edge hit
         *     {Three.Vector3} rayPt closest point on the ray
         * } or null if it's too far away
         */
        projectRay(ray) { return null; }

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
            this.mObject3D = o3d;
        }
        
        /**
         * Add the Object3D used to display this Visual to the scene
         */
        addToScene(scene) {
        }

        /**
         * Remove the Object3D associated with this visual from the scene.
         * The object is NOT deleted, just removed from the parent.
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
        get scheme() {
            let s = [];
            let self = this;
            s.push({
                title: self.constructor.name,
                type: "string",
                get: () => { return self.mName; },
                set: (v) => { self.mName = v; }
            });

            let props = [];
            for (let p in this.mProp)
                props.push({
                    title: p,
                    type: "string",
                    get: () => { return self.mProp[p]; },
                    set: (v) => { self.prop(p, v); }
                });
            s.push(props);
            return s;
        }

        /**
         * Determine if this visual contains (or is) the given item
         * @param item Visual to test
         */
        contains(vis) {
            return (vis === this);
        }

        /**
         * Add the points in visuals that have the properties isobath or point
         * and depth to a flat array suitable for passing to delaunator, with
         * a map back to the actual Point
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
