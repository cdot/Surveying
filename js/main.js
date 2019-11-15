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

requirejs(["three", "js/Survey", "js/Selection", "js/UTM", "jquery", "jquery-ui", "jquery-mousewheel"], function(Three, Survey, Selection, UTM) {
    $(function(){
        $(".dialog").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind"
        });

        let $canvas = $("#canvas");
        let survey = new Survey($canvas);
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
         * Convert an event on the canvas into a ray
         * @param e event
         */
        function event2ray(e) {
            if (!survey) return null;
            let ray = survey.canvas2ray({
                x: e.offsetX / $canvas.width(),
                y: e.offsetY / $canvas.height()
            });
            if (ray) {
                $("#cursor_wgs").html(wgsCoords(ray.start));
                $("#cursor_length").text(survey.measureCursor());
            }
            return ray;
        }

        function formatBox(b) {
            return wgsCoords(b.min) + " -> " + wgsCoords(b.max);
        }

        function enableSave() {
            $("#save").prop("disabled", !survey || !saver);
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
            let sel;
            switch (e.keyCode) {
            case 46: // delete selection
                for (sel of selection.items)
                    // Remove the item completely
                    sel.remove();
                selection.clear();
                break;

            case 37: // left, prev sibling
                sel = selection.items.slice();
                for (let s of sel) {
                    if (s.prev) {
                        selection.add(s.prev);
                        selection.remove(s);
                    }
                }
                break;
                
            case 38: // up, move up in selection
                sel = selection.items.slice();
                for (let s of sel) {
                    if (s.parent !== survey) {
                        selection.add(s.parent);
                        selection.remove(s);
                    }
                }
                break;

            case 39: // right
                sel = selection.items.slice();
                for (let s of sel) {
                    if (s.next) {
                        selection.add(s.next);
                        selection.remove(s);
                    }
                }
                break;

            case 40: // down, select first child
                sel = selection.items.slice();
                for (let s of sel) {
                    if (s.children && s.children.length > 0) {
                        selection.add(s.children[0]);
                        selection.remove(s);
                    }
                }
                break;

            case 77: // m, set measure point
                survey.measureStart();
                break;
            }
            return false;
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
            if (selection.size > 0) {
                let hit = survey.projectRay(ray);
                if (hit && selection.contains(hit.closest))
                    dragging = true;
            }
        })

        .on('mouseup', function(e) {
            if (!mouse_down || !survey) return false;
            if (!dragging) {
                if (e.offsetX === mouse_down.x && e.offsetY === mouse_down.y) {
                    if (!e.shiftKey)
                        selection.clear();
                    let ray = event2ray(event);
                    let proj = survey.projectRay(ray);
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
            if (!survey) return false;
            let ray = event2ray(e);
            if (mouse_down) {
                let p = ray.start;
                let delta = p.clone().sub(lastPt);
                if (dragging) {
                    let mat = new Three.Matrix4().makeTranslation(
                        delta.x, delta.y, 0);
                    selection.applyTransform(mat);
                } else
                    survey.panBy(delta.negate());
                lastPt = p;
            }
        })

        // Zoom in/out
        .on('mousewheel', function(event) {
            event.stopPropagation();

            if (!survey)
                return;

            if (event.deltaY < 0)
                survey.zoom(0.8);
            else
                survey.zoom(1.2);
            
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
                    new Loader().load(fn, data)
                    .then(result => {
                        survey.addChild(result);
                        console.log("Loaded", fn);
                        survey.fitScene();
                        enableSave();
                    });
                };

                // Read in the image file as a data URL.
                reader.readAsText(f);
            });
        });
        
        $("#refocus").on("click", function() {
            if (survey)
                survey.fitScene();
            return false;
        });

        $("#zoomin").on("click", function() {
            if (survey)
                survey.zoom(1.2);
            return false;
        });
        
        $("#zoomout").on("click", function() {
            if (survey)
                survey.zoom(0.8);
            return false;
        });

        $(document).on("scenechanged", function () {
            $("#scene").html(formatBox(survey.boundingBox));
        });

        $("#save").prop("disabled", true);

        // Cannot set the saver from inside the save handler because
        // loading a FileFormat requires a promise, but the native
        // click event on #save is required to trigger the download,
        // which requires a true return from the handler.
        // So have to do it in two steps. Setting the save format
        // loads the saver and enables the save button if successful.
        // Clicking the save button saves using that saver.
        
        $("#save_format").on("change", function() {
            let type = $(this).val();
            requirejs(["js/FileFormats/" + type], Format => {
                saver = new Format();
                enableSave();
            });
        });
        
        $("#save").on("click", function() {
            // If save() returns a promise, then it has used a dialog and we
            // don't require native event handling
            let str = saver.save(survey);
            if (str) {
                // The format wants to use the Save button to trigger the save
                this.href = URL.createObjectURL(new Blob([str]));
                this.download = "survey." + $("#save_format").val();
            }
            // Pass on for native event handling
            return true;
        });
    });
});
