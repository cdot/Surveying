define("js/ImagePlane", ["js/Visual", "three"], function(Visual, Three) {

    /**
     * A Visual that maps a graphic to a plane
     */
    class ImagePlane extends Visual {

        /**
         * @param filename name of the image file
         * @param {Three.Vector3} min point
         * @param {Three.Vector3} max point
         */
        constructor(filename, min, max) {
            super(filename);
            this.mImage = filename;
            this.mMin = min.clone();
            this.mMax = max.clone();
        }

        /**
         * Get the filename of the image file
         */
        get filename() {
            return this.mImage;
        }
        
        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            bb.expandByPoint(this.mMin);
            bb.expandByPoint(this.mMax);
            return bb;
        }
        
        // @Override Visual
        addToScene(scene) {
            // TODO: loader.load loads from a URL, but we want to load
            // from a file relative to the SVG
            let loader = new Three.TextureLoader();
            this.mMaterial = new Three.MeshBasicMaterial({
                map: loader.load(this.mImage),
                opacity: 0.5,
                transparent: true
            });

            // The plane for the graphic is constructed in the x-y plane
            // Constructing the plane geometry assigns vertices
            // (0, 0), (w, 0), (0, h), (w, h)
            let w = this.mMax.x - this.mMin.x;
            let h = this.mMax.y - this.mMin.y;
            this.mGeometry = new Three.PlaneGeometry(w, h);
            this.mGeometry.vertices[0].copy(this.mMin);
            this.mGeometry.vertices[1].x = this.mMax.x;
            this.mGeometry.vertices[1].y = this.mMin.y;
            this.mGeometry.vertices[1].z = this.mMax.z;
            this.mGeometry.vertices[2].x = this.mMin.x;
            this.mGeometry.vertices[2].y = this.mMax.y;
            this.mGeometry.vertices[2].z = this.mMax.z;
            this.mGeometry.vertices[3].copy(this.mMax);
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
        get report() {
            let s = super.report;
            s.push("Image: " + this.mImage);
            return s;
        }
    }

    return ImagePlane;
});
