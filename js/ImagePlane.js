define("js/ImagePlane", ["three", "js/Visual"], function(Three, Visual) {

    /**
     * A visual object that maps a graphic to a plane
     */
    class ImagePlane extends Visual {

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

        // @Override Visual
        get tag() { return "image"; }

        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mMin);
            bb.expandByPoint(this.mMax);
            return bb;
        }
        
        // @Override Visual
        addToScene(scene) {
            let loader = new Three.TextureLoader();
            // TODO: loader.load loads from a URL, but we want to load
            // from a file relative to the SVG
            this.mMaterial = new Three.MeshBasicMaterial({
                map: loader.load(this.mImage),
                side: Three.DoubleSide
            });

            // Constructing the plane geometry assigns vertices
            let w = this.mMax.x - this.mMin.x;
            let h = this.mMax.y - this.mMin.y;
            this.mGeometry = new Three.PlaneGeometry(w, h);
            // We look UP the z axis, so want the plane at the far of the view box
            this.mGeometry.vertices[0].copy(this.mMin);
            this.mGeometry.vertices[0].z = this.mMax.z;
            this.mGeometry.vertices[1].x = this.mMax.x;
            this.mGeometry.vertices[1].y = this.mMin.y;
            this.mGeometry.vertices[1].z = this.mMax.z;
            this.mGeometry.vertices[2].x = this.mMin.x;
            this.mGeometry.vertices[2].y = this.mMax.y;
            this.mGeometry.vertices[2].z = this.mMax.z;
            this.mGeometry.vertices[3].copy(this.mMax);
            this.mGeometry.vertices[3].z = this.mMax.z;
            this.mObject3D = new Three.Mesh(this.mGeometry, this.mMaterial);
            scene.add(this.mObject3D);
        }

        // @Override Visual
        remove() {
            if (this.mObject3D) {
                this.mObject3D.parent.remove(this.mObject3D);
                delete this.mObject3D;
                delete this.mGeometry;
                delete this.mMaterial;
            }
        }
        
        // @Override Visual
        applyTransform(mat) {
            this.mMin.applyMatrix4(mat);
            this.mMax.applyMatrix4(mat);
        }

        // @Override Visual
        makeDOM(doc) {
            let el = super.makeDOM(doc);
            el.setAttribute("image", this.mImage);
            el.setAttribute("min", JSON.stringify(this.mMin));
            el.setAttribute("max", JSON.stringify(this.mMax));
            return el;
        }

        // @Override Visual
        get report() {
            let s = super.report;
            s.push("Image: " + this.mImage);
            return s;
        }
    }

    return ImagePlane;
});
