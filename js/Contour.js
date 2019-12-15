/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Contour", ["three", "js/Units", "js/Materials", "js/Path"], function(Three, Units, Materials, Path) {

    class ContourVertex extends Path.Vertex {

        // @Override Path.Vertex
        scheme() {
            let s = super.scheme();
            for (let i of s)
                if (i.title === "Z")
                    i.type = "ignore";
            return s;
        }
    }

    /**
     * A contour is a specialisation of Path where the vertices
     * describe a closed path with constant Z
     */
    class Contour extends Path {

        get Vertex() {
            return Contour.Vertex;
        }
        
        constructor(name) {
            super(name);
            super.close();
        }
        
        edgeMaterial() {
            return Materials.CONTOUR;
        }

        get z() {
            return this.mZ;
        }

        setZ(z) {
            this.mZ = z;
            for (let c of this.children)
                c.setZ(z);
        }

        // @Override Visual
        applyTransform(mat) {
            super.applyTransform(mat);
            let p = new Three.Vector3(0, 0, this.mZ);
            p.applyMatrix4(mat);
            this.mZ = p.z;
        }

        // @Override Visual
        condense(coords, mapBack) {
            for (let c of this.children) {
                // console.log("Condensed vertex");
                // TODO: condense from the Contour object
                coords.push([c.position.x, c.position.y]);
                mapBack.push(c);
            }
        }

        scheme() {
            let s = super.scheme();
            let self = this;
            s.push({
                title: "Z",
                type: "number",
                get: () => self.mZ,
                set: (v) => {
                    self.setZ(v);
                }
            });
            return s;
        }
    }

    Contour.Vertex = ContourVertex;
    
    return Contour;
});
