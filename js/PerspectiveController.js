/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/PerspectiveController", ["js/CanvasController", "three", "js/OrbitControls"], function(CanvasController, Three, OrbitControls) {

    /**
     * Interactive orthographic projection
     */
    class PerspectiveController extends CanvasController {

        constructor(selector, visual, scene) {
            super(
                selector, visual, scene,
                new Three.PerspectiveCamera(45, 1, 1, -1));
            this.mCamera.position.set(0, 0, 10);
            this.mCamera.up.set(0, 0, 1);
            this.mCamera.aspect = this.mAspectRatio;

            this.mControls = new OrbitControls(
                this.mCamera, this.mRenderer.domElement);
            this.mControls.target.set(0, 0, 0);
            this.mControls.update();

            this.mConstructed = true;
        }

        // @Override CanvasController
        fit() {
            if (!this.mConstructed)
                return;
 
            let bounds = this.mVisual.boundingBox;

            // Look at the centre of the scene
            this.mControls.target = bounds.getCenter(new Three.Vector3());
            this.mCamera.position.set(bounds.max.x, bounds.max.y, bounds.max.z);
        }

        animate() {
            this.mControls.update();
            super.animate();
        }

        
        /**
         * TODO: do something sensible with this
         * Construct a new Mesh object that contains a Delaunay
         * triangulation of all the vertices in the mesh
         * @param a Visual to recursively meshify
         * @return the resulting network
         */
        meshify(visual) {
            function nextHalfedge(e) {
                return (e % 3 === 2) ? e - 2 : e + 1;
            }

            // Condense Contours and Soundings into a cloud of points
            let coords = [];
            let mapBack = [];
            visual.condense(coords, mapBack);

            let del = Delaunator.from(coords);
            let result = new Mesh("Triangulation");

            // Construct a mesh, adding condensed points back in as vertices
            for (let i in mapBack)
                mapBack[i] = result.addVertex(mapBack[i]);
            
            // Iterate over the forward edges
            for (let e = 0; e < del.triangles.length; e++) {
                if (e > del.halfedges[e]) {
                    // Not a back-edge
                    let p = mapBack[del.triangles[e]];
                    let q = mapBack[del.triangles[nextHalfedge(e)]];
                    if (!p || !q)
                        throw new Error("Internal error");
                    result.addEdge(p, q);
                }
            }
            return result;
        }
    }
    return PerspectiveController;
});
