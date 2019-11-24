/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/Contour", ["js/Path"], function(Path) {

    /**
     * A contour is a specialisation of Path where the vertices
     * describe a closed path with constant Z
     */
    class Contour extends Path {

        // @Override Visual
        prop(k, v) {
            // Impose Z on all children (which will be Vertex)
            if (k === "z" && typeof v === "number") {
                for (let c of this.children)
                    c.prop(k, v);
            }
            return super.prop(k, v);
        }
    }

    return Contour;
});
