/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Container", ["js/Visual", "three", "js/Point"], function(Visual, Three, Point) {

    /**
     * A graphical object that can contain other objects
     */
    class Container extends Visual {
        
        constructor(name) {
            super(name);
            this.mObjects = [];
        }

        get children() {
            return this.mObjects;
        }

        /**
         * Add a child visual to this container
         * @param {Visual} g
         */
        addChild(obj) {
            obj.setParent(this);
            this.mObjects.push(obj);
        }
        
        // @Override Visual
        addToScene(scene) {
            for (let o of this.mObjects)
                o.addToScene(scene);
        }

        // @Override Visual
        removeFromScene() {
            for (let o of this.mObjects)
                o.removeFromScene();
        }

        // @Override Visual
        setHandleScale(s) {
            super.setHandleScale(s);
            for (let g of this.mObjects)
                g.setHandleScale(s);
        }
        
        // @Override Visual
        remove() {
            let contents = this.mObjects.slice();
            for (let thing of contents)
                thing.remove();
            if (this.parent)
                this.parent.removeChild(this);
        }

        // @Override Visual
        removeChild(item) {
            let i = this.mObjects.indexOf(item);
            if (i < 0)
                throw new Error("Cannot remove missing child");
            this.mObjects.splice(i, 1);
        }

        /**
         * Get the child before to the given child
         */
        prevChild(child) {
            let i = this.mObjects.indexOf(child);
            if (i < 0)
                return null;
            if (i === 0)
                i = this.mObjects.length;
            return this.mObjects[i - 1];
        }
        
        /**
         * Get the child after to the given child
         */
        nextChild(child) {
            let i = this.mObjects.indexOf(child);
            if (i < 0)
                return null;
            if (i === this.mObjects.length - 1)
                i = -1;
            return this.mObjects[i + 1];
        }

        // @Override Visual
        applyTransform(mat) {
            for (let g of this.mObjects)
                g.applyTransform(mat);
        }
        
        // @Override Visual
         get boundingBox() {
             let bb = new Three.Box3();
             for (let g of this.mObjects) {
                 let gbb = g.boundingBox;
                 bb.expandByPoint(gbb.min);
                 bb.expandByPoint(gbb.max);
             }

             return bb;
        }
        
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

        // @Override
        highlight(tf) {
            for (let g of this.mObjects)
                g.highlight(tf);
        }

        // @Override Visual
        contains(item) {
            for (let g of this.mObjects) {
                if (g.contains(item))
                    return true;
            }
        }

        // @Override Visual
        scheme(skip) {
            let s = super.scheme(skip);
            if (this.mObjects.length > 0 && !/'counts'/.test(skip))
                s.push(this.mObjects.length + " object"
                       + (this.mObjects.length == 1 ? "" : "s"));
            return s;
        }
        
        // @Override Visual
        condense(coords, mapBack) {
            for (let g of this.mObjects)
                g.condense(coords, mapBack);
        }
    }

    return Container;
});
