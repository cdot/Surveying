define("js/Selection", function() {
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
         * True if the selection is empty
         */
        get isEmpty() {
            return this.mItems.length === 0;
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
         * @param {Vertex|Network} item 
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
         * @param {Vertex|Network} item 
         */
        remove(item) {
            item.highlight(false);
            this.mItems.splice(this.mItems.indexOf(item), 1);
            this._changed();
        }

        /**
         * Return true if the item exists somwehere in the graph for the
         * items in the selection
         * @param {Vertex|Network} item 
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
         * @param {Three.Matrix3|Three.Matrix4} transform matrix
         */
        applyTransform(mat) {
            for (let s of this.mItems)
                s.applyTransform(mat);
            this._changed();
        }
    }
    return Selection;
});
