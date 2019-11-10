define("js/FileFormat", function() {

    /**
     * Superclass of all loaders
     * @param source identifier for the source of the data e.g. filename
     * @param {String} data file content
     */
    class FileFormat {
        constructor(source) {
            this.mSource = source;
        }
    
        get source() {
            return this.mSource;
        }
        
        /**
         * @param source identifier for the source of the data e.g. filename
         * @param {String} data file content
         * @param metadata ref to global meta information that can be used to
         * regenerate the file
         *    { reference_point: {x:, y:, lat:, lon: }, units_per_metre: }
         *    objects: // [] of Visual }
         */
        load(source, data, metadata) {
            this.mSource = source;
            this.mNextNet = 0;
        }

        save(target) {
            throw new Error("no save() defined");
        }

        /**
         * Service for subclasses, generate a suitable ID for a net,
         * used when the data doesn't provide one
         */
        nextNet() {
            return this.mSource + (this.mNextNet++);
        }
    }

    return FileFormat;
});
