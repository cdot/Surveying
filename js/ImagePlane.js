define("js/ImagePlane", ["three", "js/GraphElement"], function(Three, GraphElement) {

    /**
     * A visual object that maps a graphic to a plane
     */
    class ImagePlane extends GraphElement {

        /**
         * @param filename name of the image file
         * @param min {x, y} of the min point
         * @param max {x, y}the max point
         */
        constructor(filename, min, max) {
            super(filename);
            this.mImage = filename;
            this.mMin = min.clone();
            this.mMax = max.clone();
        }

         // @Override
        get tag() { return "image"; }

        // @Override GraphElement
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mMin);
            bb.expandByPoint(this.mMax);
            return bb;
        }
        
        addToScene(scene) {
            let loader = new Three.TextureLoader();
            this.mMaterial = new Three.MeshBasicMaterial({
                map: loader.load(this.mImage)
            });

            // Constructing the plane geometry assigns vertices
            let w = this.mMax.x - this.mMin.x;
            let h = this.mMax.y - this.mMin.y;
            this.mGeometry = new Three.PlaneGeometry(w, h);
            this.mGeometry.vertices[0].x = this.mMin.x;
            this.mGeometry.vertices[0].y = this.mMax.y;
            this.mGeometry.vertices[1].copy(this.mMin);
            this.mGeometry.vertices[2].copy(this.mMin);
            this.mGeometry.vertices[3].x = this.mMax.x;
            this.mGeometry.vertices[3].y = this.mMin.y;
            this.mObject3D = new Three.Mesh(this.mGeometry, this.mMaterial);
            scene.add(this.mObject3D);
        }

        remove() {
            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
                delete this.mMaterial;
            }
        }
        
        scale(s) {
        }

        projectRay(ray) {
            return null;
        }

        highlight(tf) {
        }

        // @Override
        applyTransform(mat) {
            this.mMin = super.applyMatrix(mat, this.mMin);
            this.mMax = super.applyMatrix(mat, this.mMax);
        }

        // @Override
        makeDOM(doc) {
            let el = super.makeDOM(doc);
            el.setAttribute("image", this.mImage);
            el.setAttribute("min", JSON.stringify(this.mMin));
            el.setAttribute("max", JSON.stringify(this.mMax));
            return el;
        }

        // @Override
        report() {
            let s = super.report();
            s.push("Image: " + this.mImage);
        }
    }

    return ImagePlane;
});
