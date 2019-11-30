/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Path", ["js/Container", "three", "js/Point", "js/Materials"], function(Container, Three, Point, Materials) {

    class PVertex extends Point {

        // @Override Point
        addToScene(scene) {
            // A vertex only has a visual representation when
            // it is highlighted
            this.mScene = scene;
        }

        // @Override Point
        highlight(on) {
            if (!on) {
                if (this.object3D && this.object3D.parent)
                    this.object3D.parent.remove(this.object3D);
                return;
            }

            if (!this.mScene)
                return;

            if (!this.object3D) {
                // Once created, we keep the handle object around as it
                // will be useful again
                super.addToScene(this.mScene);
                super.highlight(on);
            } else
                this.mScene.add(this.object3D);
        }

        // @Override Point
        remove() {
            this.parent.removeVertex(this);
        }
        
        setZ(z) {
            let p = this.position;
            this.setPosition({ x: p.x, y: p.y, z: z });
        }
        
        scheme(skip) {
            return super.scheme(skip + "'Z'");
        }
    }

    /**
     * An open or closed path
     */
    class Path extends Container {

        addVertex(p) {
            let v = new PVertex(p);
            this.addChild(v);
            return v;
        }

        removeVertex(v) {
        }
        
        get isClosed() {
            return this.mIsClosed ? true : false;
        }
        
        close() {
            this.mIsClosed = true;
        }

        addToScene(scene) {
            super.addToScene(scene);
            if (!this.mGeometry) {
                this.mGeometry = new Three.Geometry();
                for (let v of this.children)
                    this.mGeometry.vertices.push(v.position);
            }
            if (!this.mObject3D) {
                if (this.isClosed) 
                    this.setObject3D(new Three.LineLoop(this.mGeometry,
                                                        Materials.EDGE));
                else
                    this.setObject3D(new Three.Line(this.mGeometry,
                                                    Materials.EDGE));
            }
            scene.add(this.mObject3D);
        }
        
        scheme(skip) {
            return super.scheme(skip);
        }
    }

    return Path;
});
