/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery */

define("js/FileFormats/XML", ["js/FileFormat", "jquery"], function(FileFormat) {

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

        parse(source, data) {
            this.setSource(source);
            if (!/^<\?xml/iu.test(data))
                throw new Error("XML expected");

            let dom = $.parseXML(data);
            let $xml = $(dom).find(this.mTag);
            if (!$xml)
                throw new Error(`${this.source} XML has no <${this.mTag}>`);
            return $xml;
        }
    }

    return XML;
});
