/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Container", ["js/Visual", "three"], function(Visual, Three) {

    /**
     * A graphical object that can contain other objects
     */
    class Container extends Visual {
        
        constructor(name) {
            super(name);
            this.mChildren = [];
        }

        get children() {
            return this.mChildren;
        }

        /**
         * Add a child visual to this container
         * @param {Visual} g
         */
        addChild(obj) {
            obj.setParent(this);
            this.mChildren.push(obj);
        }
        
        // @Override Visual
        addToScene(scene) {
            for (let o of this.mChildren)
                o.addToScene(scene);
        }

        // @Override Visual
        removeFromScene() {
            for (let o of this.mChildren)
                o.removeFromScene();
        }

        // @Override Visual
        setHandleScale(s) {
            super.setHandleScale(s);
            for (let g of this.mChildren)
                g.setHandleScale(s);
        }

        /**
         * Detect if this container expresses an edge between two
         * vertices.
         * @param {Point} v1 first vertex
         * @param {Point} v2 second vertex
         * @return true if the derived object has an edge between these
         * two vertices
         */
        hasEdge(/* v1, v2 */) {
            return false;
        }
        
        // @Override Visual
        remove() {
            let contents = this.mChildren.slice();
            for (let thing of contents)
                thing.remove();
            if (this.parent)
                this.parent.removeChild(this);
        }

        // @Override Visual
        removeChild(item) {
            let i = this.mChildren.indexOf(item);
            if (i < 0)
                throw new Error("Cannot remove missing child");
            this.mChildren.splice(i, 1);
        }

        /**
         * Get the child before to the given child
         */
        prevChild(child) {
            let i = this.mChildren.indexOf(child);
            if (i < 0)
                return null;
            if (i === 0)
                i = this.mChildren.length;
            return this.mChildren[i - 1];
        }
        
        /**
         * Get the child after to the given child
         */
        nextChild(child) {
            let i = this.mChildren.indexOf(child);
            if (i < 0)
                return null;
            if (i === this.mChildren.length - 1)
                i = -1;
            return this.mChildren[i + 1];
        }

        // @Override Visual
        applyTransform(mat) {
            for (let g of this.mChildren)
                g.applyTransform(mat);
        }
        
        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            for (let g of this.mChildren) {
                let gbb = g.boundingBox;
                bb.expandByPoint(gbb.min);
                bb.expandByPoint(gbb.max);
            }

            return bb;
        }
        
        // @Override
        projectRay(ray, range2) {
            let best;

            for (let g of this.mChildren) {
                let d = g.projectRay(ray, range2);
                if (d && (!best || d.dist2 < best.dist2))
                    best = d;
            }

            return best;
        }

        // @Override
        highlight(tf) {
            for (let g of this.mChildren)
                g.highlight(tf);
        }

        // @Override Visual
        contains(item) {
            for (let g of this.mChildren) {
                if (g.contains(item))
                    return true;
            }
            return false;
        }

        // @Override Visual
        condense(coords, mapBack) {
            for (let g of this.mChildren)
                g.condense(coords, mapBack);
        }
    }

    return Container;
});
