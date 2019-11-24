/* @copyright 2019 Crawford Currie - ALl rights reserved */
define("js/Path", ["js/Network", "js/Edge"], function(Network, Edge) {

    /**
     * A specialisation of Network where the vertices
     * describe an open path
     */
    class Path extends Network {

        // @Override Network
        addEdge(e, p) {
            // Not meaningful
            throw new Error("addEdge on a Path?");
        }

        addChild(v) {
            let last = this.children[this.children.length - 1];
            super.addChild(v);
            // Extend the path edges
            if (last)
                super.addEdge(new Edge(last, v));
        }

        close() {
            super.addEdge(new Edge(this.children[this.children.length - 1],
                                  this.children[0]));
        }
    }

    return Path;
});
