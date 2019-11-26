/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/Path", ["js/Network", "js/Edge"], function(Network, Edge) {

    /**
     * A specialisation of Network where the vertices
     * describe an open path
     */
    class Path extends Network {

        addChild(v) {
            let last = this.children[this.children.length - 1];
            super.addChild(v);
            // Extend the path edges
            if (last)
                super.addEdge(last, v);
        }

        get isClosed() {
            return this.mIsClosed ? true : false;
        }
        
        close() {
            super.addEdge(new Edge(this.children[this.children.length - 1],
                                   this.children[0]));
            this.mIsClosed = true;
        }
        
        scheme(skip) {
            return super.scheme(skip);
        }
    }

    return Path;
});
