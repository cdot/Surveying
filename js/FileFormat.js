/* @copyright 2019 Crawford Currie - All rights reserved */
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
            return Promise.reject(
                new Error(`No ${this.constructor.name}.load()`));
        }

        /**
         * Save, or serialise, the visual. Because browsers require a
         * user action to trigger a download action, we have to be
         * able to return true from a click handler. That click
         * handler can either be associated with the front page "save"
         * button, or it can be associated with a button on a
         * dialog. Some formats, such as .svg, naturally have such a
         * dialog; other formats, such as .survey, do not.  We handle
         * this difference by using this method either as a serialiser
         * (return a string, caller expected to handle the download)
         * or as a save method (dialog button handles the download).
         * @param {Visual} visual to save
         * @return {String} stringified version of the visual, or null if the
         * method has handled saving internally
         * @abstract
         */
        save(visual) {
            throw new Error("no save() defined");
        }
    }

    return FileFormat;
});
