/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Contour", ["js/Path"], function(Path) {

    /**
     * A contour is a specialisation of Path where the vertices
     * describe a closed path with constant Z
     */
    class Contour extends Path {

        constructor(name) {
            super(name);
            super.close();
        }
        
        get z() {
            this.mZ;
        }

        setZ(z) {
            this.mZ = z;
            // Impose Z on all children (which will be Vertex)
            for (let c of this.children)
                c.setZ(z);
        }

        scheme(skip) {
            let s = super.scheme(skip);
            let self = this;
            s.push({
                title: "Z",
                type: "number",
                get: () => { return self.mZ; },
                set: (v) => {
                    self.setZ(v);
                }
            });
            return s;
        }
    }

    return Contour;
});
