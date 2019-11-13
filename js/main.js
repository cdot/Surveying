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

requirejs(["three", "js/Survey", "js/Selection", "js/UTM", "jquery", "jquery-mousewheel"], function(Three, Survey, Selection, UTM) {
    $(function(){
        let $canvas = $("#canvas");
        let network = new Survey($canvas);
        let saver;

        /**
         * Format a point for display as a lat,long
         */
        function wgsCoords(p) {
            function round(x, pos, neg) {
                let v = Math.floor(100000 * x) / 100000;
                return (v < 0) ? (-v + "&deg;" + neg) : (v + "&deg;" + pos)
            }
            let ll = new UTM(p.x, p.y).toLatLong();
            return round(ll.latitude, "N", "S") + " " + round(ll.longitude, "E", "W");
        }

        /**
         * Format a point for display using internal coordinates
         */
        function userCoords(p) {
            return p.x + ", " + p.y;
        }
        
        /**
         * Format a point for display using file coordinates
         */
        function fileCoords(p) {
            if (!network)
                return "";
            let pu = network.user2saveUnits(p)
            return pu.x + ", " + pu.y;
        }
        
        /**
         * Convert an event on the canvas into a ray
         * @param e event
         */
        function event2ray(e) {
            if (!network) return null;
            let ray = network.canvas2ray({
                x: e.offsetX / $canvas.width(),
                y: e.offsetY / $canvas.height()
            });
            if (ray) {
                $("#cursor_wgs").html(wgsCoords(ray.start));
                $("#cursor_user").html(userCoords(ray.start));
                $("#cursor_save").html(fileCoords(ray.start));
            }
            return ray;
        }

        function formatBox(b) {
            return userCoords(b.min) + " -> " + userCoords(b.max);
        }

        function enableSave() {
            $("#save").prop("disabled", !network || !saver);
        }
        
        let mouse_down; // button flags
        let selection = new Selection(sln => {
            let $report = $("<ul></ul>");
            for (let sel of sln.items) {
                let r = sel.report;
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
            switch (e.keyCode) {
            case 46: // delete
                for (let sel of selection.items)
                    // Remove the item completely
                    sel.remove();
                selection.clear();
                return false;
            case 38: // up
                let oldSel = selection.items.slice();
                for (let sel of oldSel) {
                    if (sel.parent !== network) {
                        selection.add(sel.parent);
                        selection.remove(sel);
                    }
                }
                return false;
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
            if (!network) return false;
            let ray = event2ray(e);
            if (mouse_down) {
                let p = ray.start;
                let delta = p.clone().sub(lastPt);
                if (dragging) {
                    let mat = new Three.Matrix4().makeTranslation(
                        delta.x, delta.y, 0);
                    selection.applyTransform(mat);
                } else
                    network.panBy(delta.negate());
                lastPt = p;
            }
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

        $("#load").on("change", function(evt) {
            let f = evt.target.files[0];
            let fn = f.name;
            let type = fn.replace(/^.*\./, "").toLowerCase();

            requirejs(["js/FileFormats/" + type], Loader => {
                let reader = new FileReader();

                reader.onload = e => {
                    let data = e.target.result;
                    let result = new Loader().load(fn, data);
                    network.addVisuals(result.visuals);
                    network.setMetadata(result.metadata || {});
                    console.log("Loaded", fn);
                    network.fitScene();
                    enableSave();
                };

                // Read in the image file as a data URL.
                reader.readAsText(f);
            });
        });
        
        $("#refocus").on("click", function() {
            if (network)
                network.fitScene();
            return false;
        });

        $("#zoomin").on("click", function() {
            if (network)
                network.zoom(1.2);
            return false;
        });
        
        $("#zoomout").on("click", function() {
            if (network)
                network.zoom(0.8);
            return false;
        });

        $(document).on("scenechanged", function () {
            $("#scene").html(formatBox(network.boundingBox));
        });

        $(document).on("viewchanged", function() {
//            $("#viewport").html(formatBox(network.viewport));
        });

        // Cannot set the saver from inside the save handler because
        // loading a FileFormat requires a promise, but the native
        // click event on #save is required to trigger the download,
        // which requires a true return from the handler.
        // So have to do it in two steps.
        
        $("#save").prop("disabled", true);

        $("#save_format").on("change", function() {
            let type = $(this).val();
            requirejs(["js/FileFormats/" + type], Format => {
                saver = new Format();
                enableSave();
            });
        });
        
        $("#save").on("click", function() {
            let str = saver.save(network);
            this.href = URL.createObjectURL(new Blob([str]));
            this.download = "survey." + $("#save_format").val();
            // Pass on for handling native event
            return true;
        });
    });
});
