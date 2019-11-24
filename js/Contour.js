/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/Contour", ["js/Path", "js/Vertex"], function(Path, Vertex) {

    class ContourVertex extends Vertex {

        setZ(z) {
            let p = this.position;
            this.setPosition({ x: p.x, y: p.y, z: z });
        }
        
        scheme(skip) {
            return super.scheme(skip + "'Z'");
        }
    }

    /**
     * A contour is a specialisation of Path where the vertices
     * describe a closed path with constant Z
     */
    class Contour extends Path {

        addVertex(p) {
            let v = new ContourVertex(p);
            this.addChild(v);
            return v;
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
