define("js/FileFormats/XML", [ "js/FileFormat", "jquery"], function(FileFormat) {

    /**
     * Base class of all XML loaders
     */
    class XML extends FileFormat {
        /**
         * @param {String} tag XML tag for this loader e.g. "svg"
         */
        constructor(tag) {
            super();
            this.mTag = tag;
        }

        // @Override FileFormat
        load(source, data, metadata) {
            super.load(source, data, metadata);
            if (!/^<\?xml/i.test(data))
                throw new Error("XML expected");
            
            let dom = $.parseXML(data);
            let $xml = $(dom).find(this.mTag);
            if (!$xml)
                throw new Error(source + " has no <" + this.mTag);
            return $xml;
        }
    }
    
    return XML;
});
