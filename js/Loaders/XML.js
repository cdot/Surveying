define("js/Loaders/XML", function() {

    /**
     * Base class of all XML loaders
     */
    class XML {
        /**
         * @param source identifier for the source of the data e.g. filename
         * @param {String} data file content
         */
        constructor(source, data, tag) {
            this.mTag = tag;
            this.mSource = source;
            if (!/^<\?xml/i.test(data))
                throw new Error("XML expected");
            
            let dom = new DOMParser().parseFromString(data, "text/xml");
            this.mElement = dom.getElementsByTagName(tag)[0];
            if (!this.mElement)
                throw new Error(source + " has no <" + tag);
            this.mNextNet = 0;
        }

        /**
         * Get the root node of the parsed XML
         */
        get root() {
            return this.mElement;
        }

        get source() {
            return this.mSource;
        }
        
        /**
         * Pure virtual
         * Load networks
         */
        load() {
            throw new Error(this.mTag + " loader must define load()");
        }

        /**
         * Service for subclasses, generate a suitable ID for a net,
         * used when the XML data doesn't provide one
         */
        nextNet() {
            return this.mSource + (this.mNextNet++);
        }
    }
    
    return XML;
});
