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
        constructor(name, filename, min, max) {
            super(name);
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
                opacity: 0.9,
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
            this.setObject3D(new Three.Mesh(this.mGeometry, this.mMaterial));
            scene.add(this.object3D);
        }

        // @Override Visual
        applyTransform(mat) {
            this.mMin.applyMatrix4(mat);
            this.mMax.applyMatrix4(mat);
        }

        // @Override Visual
        get scheme() {
            let s = super.scheme;
            s.push({
                title: "URL",
                type: "string",
                get: () => { return self.mImage; },
                set: (v) => {
                    self.mImage = v;
                    self.mMaterial = new Three.MeshBasicMaterial({
                        map: loader.load(v),
                        opacity: 0.9,
                        transparent: true
                    });
                    this.object3D.material = self.mMaterial;
                }
            });
            return s;
        }
    }

    return ImagePlane;
});
