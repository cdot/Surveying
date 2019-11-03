requirejs.config({
    baseUrl: ".",
    urlArgs: "t=" + Date.now(),
    paths: {
        "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery",
        "jquery-ui": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui",
        "jquery-ui/ui": "//cdn.jsdelivr.net/npm/jquery-ui@1.12.1/ui",
        "jquery-csv": "//cdnjs.cloudflare.com/ajax/libs/jquery-csv/1.0.5/jquery.csv",
        "jquery-mousewheel": "//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel",
        "three": "//cdnjs.cloudflare.com/ajax/libs/three.js/106/three"
    }
});

requirejs(["three", "js/NetworkScene", "jquery", "jquery-mousewheel"], function(Three, NetworkScene) {
    $(function(){
        let $canvas = $("#canvas");
        canvasRect = $canvas[0].getBoundingClientRect();
        
        let renderer = new Three.WebGLRenderer();

        let dim = { w: $canvas.width(), h: $canvas.height() };
        renderer.setSize(dim.w, dim.h);
        $canvas.append(renderer.domElement);

        let network, camera;

        function event2ray(e) {
            if (!network) return null;
            let ray = network.canvas2ray({
                x: e.offsetX / canvasRect.width,
                y: e.offsetY / canvasRect.height
            });
            if (ray)
                $("#cursor").text(ray.start.x + ", " + ray.start.y);
            return ray;
        }

        let hit; // ref to dragged object
        let mousePosition = new Three.Vector3(); // mouse position in 3-space
        let mouse_down; // button flags
        let onvertex =- null;
        
        $("#noform").on("submit", () => false);
               
        $canvas.on("keydown", function(e) {
            if (mouse_down && e.keyCode == 37) { // left
                hit.draggable.rotate(hit.vertex.current, Math.PI / 180);
            } else if (mouse_down && e.keyCode == 39) { // right
                hit.draggable.rotate(hit.vertex.current, -Math.PI / 180);
            } else if (e.key === "d" && onvertex) {
                console.log("Delete", onvertex);
                network.removeVertex(onvertex);
            }
        })
                   
        .on("mouseover", function() {
            $canvas.focus();
        })
        
        .on('mousedown', function(event) {
            mouse_down = true;
            if (!network) return;
            let ray = event2ray(event);
            hit = network.getClosestDraggable(ray);
            mousePosition.copy(hit.rayPt);
            if (event.altKey) {
                // ALT key down, pan view to clicked point
                network.centre(ray.start);
            }
        })

        .on('mouseup', function(event) {
            mouse_down = false;
            if (!network) return;
            hit = null;
        })
                
        .on('mousemove', function(event) {
            if (!network) return;
            let ray = event2ray(event);
            let h = network.getClosestDraggable(ray);
            if (!h)
                return;
            if (onvertex)
                onvertex.highlight(false);
            onvertex = h.vertex;
            onvertex.highlight(true);
            $("#vertex").text(
                onvertex.id
                + " (" + onvertex.current.x + "," + onvertex.current.y + ")"
                + (mouse_down ? " Moving" : ""));
            $("#network").text(onvertex.parent.id);
            if (!mouse_down) return;
            ray.closestPointToPoint(
                hit.vertex.current, false, mousePosition);
            hit.draggable.dragTo(mousePosition);
        })

        .on('mousewheel', function(event) {
            event.stopPropagation();

            if (!network)
                return;

            if (event.deltaY > 0)
                network.zoom(0.8);
            else
                network.zoom(1.2);
            
            return false;
        });

        $("#import").on("change", function(evt) {
            let f = evt.target.files[0];
            let fn = f.name;

            let reader = new FileReader();

            reader.onload = e => {
                let data = e.target.result;
                if (network)
                    network.stopAnimation();
                else
                    network = new NetworkScene(renderer);

                network.load(fn, data).then(() => {
                    console.log("Loaded", fn);
                    network.animate();
                });
            };

            // Read in the image file as a data URL.
            reader.readAsText(f);
        });

        $("#refocus").on("click", function() {
            if (network)
                network.refocus();
        });
    });
});
