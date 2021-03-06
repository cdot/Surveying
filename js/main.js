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

requirejs(["three", "js/Units", "js/SceneController", "js/OrthographicController", "js/PerspectiveController", "js/Container", "jquery", "jquery-ui", "jquery-mousewheel"], function(Three, Units, SceneController, OrthographicController, PerspectiveController, Container) {

    const ORTHOGRAPHIC = 0;
    const PERSPECTIVE = 1;
    let views = [];
    let sceneController;
    
    function activeView() {
        for (let i = 0; i < views.length; i++)
            if (views[i].isVisible)
                return views[i];
        return null;
    }

    function onCmd(cmd) {
	if (activeView().onCmd(cmd) || sceneController.onCmd(cmd))
	    return true;

	let m = /^showView([0-9]+)$/.exec(cmd);
	if (m) {
	    let av = activeView();
	    if (av !== null) av.hide();
	    views[m[1]].show();
	    return true;
	}
	return false;
    }
   
    $(function() {
        $(".menu").menu();

        $(".dialog").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind"
        });
        
        sceneController = new SceneController();
        views = [
            new OrthographicController($("#orthographic"), sceneController),
            new PerspectiveController($("#perspective"), sceneController)
        ];
	
        $(".disable_submit").on("submit", () => false);

        $(window).on("resize", function() {
            for (let v of views)
                v.resize();
        });

        $(document)
        .on("fitViews", function() {
            for (let v of views)
                v.fit();
        });

        $(".menu")
        .on("menuselect", function (e, ui) {
            onCmd(ui.item.data("cmd"));
        });
            
        $(".toolbar button")
        .on("click", () => {
            onCmd($(this).data("cmd"));
        });

        $(".menubar").show();

        views[0].show();
    });
});
