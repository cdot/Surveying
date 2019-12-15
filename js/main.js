/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery, browser */
/* global requirejs */

requirejs.config({
    baseUrl: ".",
    urlArgs: `t=${Date.now()}`,
    paths: {
        "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery",
        "jquery-ui": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui",
        "jquery-ui/ui": "//cdn.jsdelivr.net/npm/jquery-ui@1.12.1/ui",
        "jquery-csv": "//cdnjs.cloudflare.com/ajax/libs/jquery-csv/1.0.5/jquery.csv",
        "jquery-mousewheel": "//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel",
        "three": "//cdnjs.cloudflare.com/ajax/libs/three.js/109/three",
        "delaunator": "//cdn.jsdelivr.net/npm/delaunator@4.0.1/delaunator.min"
    }
});

requirejs(["three", "js/Units", "js/OrthographicController", "js/PerspectiveController", "js/Container", "jquery", "jquery-ui", "jquery-mousewheel"], function(Three, Units, OrthographicController, PerspectiveController, Container) {
    $(function() {
        $(".dialog").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind"
        });

        let saver;

        // Create the three.js scene. This is shared between the canvases.
        let scene = new Three.Scene();
        scene.background = new Three.Color(0xF0F0F0);

        let rootContainer = new Container("root");
        let orthographic = new OrthographicController(
            $("#orthographic"), rootContainer, scene);
        let perspective = new PerspectiveController(
            $("#perspective"), rootContainer, scene);
        orthographic.animate();
        perspective.animate();

        $(window).on("resize", function() {
            // Resize the canvases
            let $a = $("#orthographic");
            let w = $a.parent().innerWidth();
            let h = $a.parent().innerHeight();
            orthographic.resize(w, h);
            perspective.resize(w, h);
        });
          
        /**
         * Format a point for display as a lat,long
         */
        function wgsCoords(p) {
            return Units.stringify(Units.IN, p, Units.LATLON);
        }

        function wgsBox(b) {
            return `${wgsCoords(b.min)} -> ${wgsCoords(b.max)}`;
        }

        function enableSave() {
            $("#save").prop("disabled", !saver);
        }
        
        $("#load").on("change", function(evt) {
            let f = evt.target.files[0];
            let fn = f.name;
            let type = fn.replace(/^.*\./u, "").toLowerCase();

            requirejs(
                [`js/FileFormats/${type}`],
                (Loader) => {
                    let reader = new FileReader();

                    reader.onload = (e) => {
                        let data = e.target.result;
                        new Loader().load(fn, data)
                        .then((result) => {
                            rootContainer.addChild(result);
                            result.addToScene(scene);
                            console.log("Loaded", fn);
                            $("#scene").html(wgsBox(rootContainer.boundingBox));
                            orthographic.fit();
                            perspective.fit();
                            enableSave();
                        })
                        .catch((err) => {
                            console.debug(err);
                        });
                    };

                    // Read in the image file as a data URL.
                    reader.readAsText(f);
                },
                (err) => {
                    $("#alert_message")
                    .html(`Error loading js/FileFormats/${type} - is the file format supported?`);
                    $("#alert").dialog("open");
                });
        });

        // Information tab
        $(document).on("cursorchanged", function() {
            try {
                $("#cursor_wgs").html(wgsCoords(orthographic.cursor));
            } catch (e) {
            }
            $("#cursor_length").text(orthographic.rulerLength);
            $("#cursor_bearing").text(orthographic.rulerBearing);
        });

        // Controls - do something smarter with these, a la inkscape
        $("#refocus").on("click", function() {
            orthographic.fit();
            perspective.fit();
            return false;
        });

        $("#zoomin").on("click", function() {
            orthographic.zoom(1.2);
            return false;
        });
        
        $("#zoomout").on("click", function() {
            orthographic.zoom(0.8);
            return false;
        });

        $("#toggle").on("click", function() {
            $("#perspective").toggle();
            $("#orthographic").toggle();
            return false;
        });

        $("#addpoint").on("click", function() {
            orthographic.addPoint();
        });
        
        $("#addcontour").on("click", function() {
            orthographic.addContour();
        });
        
        $("#splitedges").on("click", function() {
            orthographic.splitSelectedEdges();
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
            requirejs(
                [`js/FileFormats/${type}`],
                (Format) => {
                    saver = new Format();
                    enableSave();
                });
        });
        
        $("#save").on("click", function() {
            let str = saver.save(rootContainer);
            // If saver.save() returns null, then it has used a dialog and we
            // don't require native event handling
            if (!str)
                return false; // suppress native event handling

            // The format wants to use the Save button to trigger the save
            this.href = URL.createObjectURL(new Blob([str]));
            let fmt = $("#save_format").val();
            this.download = `survey.${fmt}`;

            // Pass on for native event handling
            return true;
        });

        $("#perspective").toggle();
    });
});
