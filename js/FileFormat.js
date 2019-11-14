define("js/FileFormat", function() {

    /**
     * Superclass of all loaders
     * @param source identifier for the source of the data e.g. filename
     * @param {String} data file content
     */
    class FileFormat {
        constructor(source) {
            this.mSource = source;
            this.mNextNet = 0;
        }

        setSource(s) {
            this.mSource = s;
        }
        
        get source() {
            return this.mSource;
        }
        
        /**
         * @param source identifier for the source of the data e.g. filename
         * @param {String} data file content
         * @return Promise that resolves to a {Visual} content
         */
        load(source, data) {
            return Promise.reject(this.constructor.name + " cannot load()");
        }

        /**
         * Promise to save the visual
         * @param {Visual} visual to save
         * @return {String} stringified version of the visual, or null if the
         * method has handled saving internally
         */
        save(visual) {
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
