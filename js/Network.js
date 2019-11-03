define("js/Network", ["three", "js/Vertex", "js/Edge", "js/Group"], function(Three, Vertex, Edge, Group) {

    /**
     * A network of interconnected vertices (Vertex) joined by edges (Edge)
     */
    class Network extends Group {

        /**
         * @param id network id
         */
        constructor(id) {
            super(id);
            this.mEdges = [];
        }

        addEdge(e) {
            this.mEdges.push(e);
            return e;
        }
       
        addToScene(scene) {
            // Add vertex markers
            super.addToScene(scene);
            // Add edge lines
            for (let e of this.mEdges)
                e.addToScene(scene);
        }

        removeFromScene(scene) {
            super.removeFromScene(scene);
            for (let e of this.mEdges)
                e.removeFromScene(scene);
        }
    }
    return Network;
});
