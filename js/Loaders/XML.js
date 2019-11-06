define("js/Loaders/XML", [ "jquery"], function() {

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
            
            let dom = $.parseXML(data);
            this.m$xml = $(dom).find(tag);
            if (!this.m$xml)
                throw new Error(source + " has no <" + tag);
            this.mNextNet = 0;
        }

        get $xml() {
            return this.m$xml;
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
