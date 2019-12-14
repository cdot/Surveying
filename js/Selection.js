/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Selection", function() {
    
    /**
     * A collection of Visuals
     */
    class Selection {
        constructor(onChange) {
            this.mItems = [];
            this.mOnChange = onChange;
        }

        _changed() {
            if (this.mOnChange)
                this.mOnChange(this);
        }
        
        /**
         * Get an array ofthe items in the selection
         */
        get items() {
            return this.mItems;
        }

        /**
         * Get the number of items in the selection
         */
        get size() {
            return this.mItems.length;
        }
        
        /**
         * Empty the selection
         */
        clear() {
            for (let s of this.mItems)
                s.highlight(false);
            this.mItems = [];
            this._changed();
        }

        /**
         * Add an item to the selection
         * @param {Visual} item 
         */
        add(item) {
            if (!this.contains(item)) {
                item.highlight(true);
                this.mItems.push(item);
                this._changed();
            }
        }

        /**
         * Remove the given item from the selection. Does *not* do a
         * contains test, the item must be in the selection, not just
         * in the graph under the seleced items
         * @param {Visual} item 
         */
        remove(item) {
            item.highlight(false);
            this.mItems.splice(this.mItems.indexOf(item), 1);
            this._changed();
        }

        /**
         * Return true if the item exists somwehere in the graph for the
         * items in the selection
         * @param {Visual} item 
         */
        contains(item) {
            if (this.mItems.indexOf(item) >= 0)
                return true;
            for (let s of this.mItems)
                if (s === item || s.contains && s.contains(item))
                    return true;
            return false;
        }

        /**
         * Apply the given transform to the selected items
         * @param {Three.Matrix4} transform matrix
         */
        applyTransform(mat) {
            for (let s of this.mItems)
                s.applyTransform(mat);
            this._changed();
        }

        /**
         * Set the handle size on selected items
         */
        setHandleScale(scale) {
            for (let s of this.mItems)
                s.setHandleScale(scale);
        }
    }
    return Selection;
});
