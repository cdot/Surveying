define("js/ImagePlane", ["js/Visual", "three"], function(Visual, Three) {

    /**
     * A graphic mapped to a plane. Initially the graphic is mapped
     * to the X-Y plane with Z=0, but can be transformed using applyTransform.
     */
    class ImagePlane extends Visual {

        /**
         * @param url address of the image
         * @param width of the image in world coordinates
         * @param height of the image in world coordinates
         * @param {Three.Matrix4} (optional) initial transform 
         */
        constructor(name, url, width, height, transform) {
            super(name);
            this.mImage = url;
            this.mWidth = width;
            this.mHeight = height;
            this.mTransform = transform || new Three.Matrix4();
        }

        /**
         * Get the url of the image
         */
        get url() {
            return this.mUrl;
        }

        /**
         * Get the transform for the image
         */
        get transform() {
            return this.mTransform;
        }
        
        /**
         * Get the base width of the image
         */
        get width() {
            return this.mWidth;
        }
        
        /**
         * Get the base height of the image
         */
        get height() {
            return this.mHeight;
        }
        
        // @Override Visual
        get boundingBox() {
            let bb = new Three.Box3();
            this._makeGeometry();
            return this.mGeometry.boundingBox;
        }

        _makeGeometry() {
            if (!this.mGeometry) {
                // Create an X-Y plane
                this.mGeometry = new Three.PlaneGeometry(
                    this.mWidth, this.mHeight);
                this.mGeometry.applyMatrix(this.mTransform);
            }
        }
        
        // @Override Visual
        addToScene(scene) {
            if (!this.object3D) {
                let loader = new Three.TextureLoader();
                this.mMaterial = new Three.MeshBasicMaterial({
                    map: loader.load(this.mUrl),
                    opacity: 0.9,
                    transparent: true
                });

                _makeGeometry();
                this.setObject3D(
                    new Three.Mesh(this.mGeometry, this.mMaterial));
                this.mGeometry.applyMatrix(mat);
            }
            scene.add(this.object3D);
        }

        // @Override Visual
        applyTransform(mat) {
            _makeGeometry();
            this.mTransform.multiply(mat);
            this.mGeometry.applyMatrix(mat);
        }

        // @Override Visual
        scheme(skip) {
            let s = super.scheme(skip);
            let self = this;
            s.push({
                title: "URL",
                type: "string",
                get: () => { return self.mUrl; },
                set: (v) => {
                    self.mUrl = v;
                    self.mMaterial = new Three.MeshBasicMaterial({
                        map: loader.load(v),
                        opacity: 0.9,
                        transparent: true
                    });
                    this.object3D.material = self.mMaterial;
                }
            });
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

    return ImagePlane;
});
