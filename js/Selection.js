define("js/Selection", function() {
    class Selection {
        constructor() {
            this.mItems = [];
        }

        get items() {
            return this.mItems;
        }

        get isEmpty() {
            return this.mItems.length === 0;
        }
        
        clear() {
            for (let s of this.mItems)
                s.highlight(false);
            this.mItems = [];
        }

        add(item) {
            if (!this.contains(item)) {
                item.highlight(true);
                this.mItems.push(item);
            }
        }

        remove(item) {
            item.highlight(false);
            this.mItems.splice(this.mItems.indexOf(item), 1);
        }

        contains(item) {
            if (this.mItems.indexOf(item) >= 0)
                return true;
            for (let s of this.mItems)
                if (s === item || s.contains && s.contains(item))
                    return true;
            return false;
        }

        applyTransform(mat) {
            for (let s of this.mItems)
                s.applyTransform(mat);
        }
    }
    return Selection;
});
