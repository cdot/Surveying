define("js/Materials", ["three"], function(Three) {
    return {
        RULER: new Three.LineBasicMaterial({color: 0xFF0F0F}),
        VERTEX: new Three.MeshBasicMaterial({color: 0xFF0000}),
        POINT: new Three.MeshBasicMaterial({color: 0x00FF00}),
        POINT_SELECTED: new Three.MeshBasicMaterial({color: 0xFF0000}),
        EDGE: new Three.LineBasicMaterial({color: 0x0000FF}),
        EDGE_SELECTED: new Three.LineBasicMaterial({color: 0xFF00FF})
    };
});

    
