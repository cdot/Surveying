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

requirejs(["three", "js/Survey", "js/Selection", "jquery", "jquery-mousewheel"], function(Three, Survey, Selection) {
    $(function(){
        let $canvas = $("#canvas");
        canvasRect = $canvas[0].getBoundingClientRect();
        
        let renderer = new Three.WebGLRenderer();

        let dim = { w: $canvas.width(), h: $canvas.height() };
        renderer.setSize(dim.w, dim.h);
        $canvas.append(renderer.domElement);

        let network, camera;

        /**
         * Convert an event on the canvas into a ray
         * @param e event
         */
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

        let mouse_down; // button flags
        let selection = new Selection(items => {
            let $report = $("<ul></ul>");
            for (let sel of items) {
                let r = sel.report();
                let $item = $("<li>" + r.shift() + "</li>");
                if (r.length > 0) {
                    let $block = $("<ul></ul>");
                    for (let line of r)
                        $block.append("<li>" + line + "</li>");
                    $item.append($block);
                }
                $report.append($item);
            }
            $("#report").empty().append($report);
        });

        let dragging = false;
        let lastPt;

        $("#noform").on("submit", () => false);
               
        $canvas.on("keydown", function(e) {
            /*if (mouse_down && e.keyCode == 37) { // left
                hit.draggable.rotate(hit.vertex.position, Math.PI / 180);
            } else if (mouse_down && e.keyCode == 39) { // right
                hit.draggable.rotate(hit.vertex.position, -Math.PI / 180);
                } else */
            if (!mouse_down) {
                if (e.keyCode === 46) { // delete
                    for (let sel of selection.items)
                        // Remove the item completely
                        sel.remove();
                    selection.clear();
                } else if (e.keyCode == 38) { // up
                    let oldSel = selection.items.slice();
                    for (let sel of oldSel) {
                        if (sel.parent !== network) {
                            selection.add(sel.parent);
                            selection.remove(sel);
                        }
                    }
                }
            }
        })

        .on("mouseenter", function() {
            $canvas.focus();
            mouse_down = false;
            dragging = false;
        })

        .on("mouseleave", function() {
            mouse_down = false;
            dragging = false;
        })
        
        .on('mousedown', function(e) {
            mouse_down = {x: e.offsetX, y: e.offsetY};
            let ray = event2ray(e);
            lastPt = ray.start.clone();
            if (!selection.isEmpty) {
                let hit = network.projectRay(ray);
                if (hit && selection.contains(hit.closest))
                    dragging = true;
            }
        })

        .on('mouseup', function(e) {
            if (!mouse_down || !network) return false;
            if (!dragging) {
                if (e.offsetX === mouse_down.x && e.offsetY === mouse_down.y) {
                    if (!e.shiftKey)
                        selection.clear();
                    let ray = event2ray(event);
                    let proj = network.projectRay(ray);
                    if (proj)
                        selection.add(proj.closest);
                    else
                        selection.clear();
                } else
                    selection.clear();
            }
            mouse_down = null;
            dragging = false;
        })
                
        .on('mousemove', function(e) {
            if (!mouse_down || !network) return false;
            let ray = event2ray(e);
            let p = ray.start;
            let delta = p.clone().sub(lastPt);
            if (dragging) {
                let mat = new Three.Matrix4().makeTranslation(
                    delta.x, delta.y, 0);
                selection.applyTransform(mat);
            } else
                network.panBy(delta.negate());
            lastPt = p;
        })

        // Zoom in/out
        .on('mousewheel', function(event) {
            event.stopPropagation();

            if (!network)
                return;

            if (event.deltaY < 0)
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
                    network = new Survey(renderer);

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

        $("#save").on("click", function() {
            if (!network)
                return false;
            let doc = document.implementation.createDocument("", "", null);
            doc.appendChild(network.makeDOM(doc));
            let str =
                '<?xml version="1.0" encoding="UTF-8"?>'
                +  new XMLSerializer().serializeToString(doc);
            let data = new Blob([str]);
            this.href = URL.createObjectURL(data);
            this.download = "survey.survey";
            return true;
         });
    });
});
