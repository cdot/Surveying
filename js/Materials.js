/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Materials", ["three"], function(Three) {
    let handle = new Three.TextureLoader().load("images/handle.png");
    return {
        RULER: new Three.LineBasicMaterial({ color: 0xFF0F0F }),
        HANDLE: new Three.SpriteMaterial({ map: handle, color: 0xffffff }),
        POINT: new Three.MeshBasicMaterial({ color: 0x00FF00 }),
        POINT_SELECTED: new Three.MeshBasicMaterial({ color: 0xFF0000 }),
        EDGE: new Three.LineBasicMaterial({ color: 0x0000FF }),
        EDGE_SELECTED: new Three.LineBasicMaterial({ color: 0xFF00FF })
    };
});

    
