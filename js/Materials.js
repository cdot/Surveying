/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Materials", ["three"], function(Three) {
    
    let Materials = {};
    
    Materials.RULER
    = new Three.LineBasicMaterial({ color: 0xFF0F0F });
    
    Materials.HANDLE = new Three.SpriteMaterial({
        map: new Three.TextureLoader().load("images/handle.png"),
        color: 0xffffff
    });

    Materials.CURSOR = new Three.SpriteMaterial({
        map: new Three.TextureLoader().load("images/cursor.png"),
        color: 0xffffff
    });
    
    Materials.POI
    = new Three.MeshBasicMaterial({ color: 0x00FF00 });
    
    Materials.POI_SELECTED
    = new Three.MeshBasicMaterial({ color: 0xFF0000 });
    
    let smap = new Three.TextureLoader().load("images/sounding.png");
    Materials.SOUNDING
    = new Three.SpriteMaterial({ map: smap, color: 0xffffff });
    
    Materials.SOUNDING_SELECTED
    = new Three.SpriteMaterial({ map: smap, color: 0xff0000 });
    
    Materials.MESH
    new Three.MeshStandardMaterial({ color : 0x23120B });

    Materials.WIREFRAME
    new Three.LineBasicMaterial({ color : 0x23120B });
    
    Materials.PATH
    = new Three.LineBasicMaterial({ color: 0x000000 });
    
    Materials.CONTOUR
    = new Three.LineBasicMaterial({ color: 0x0000FF });

    return Materials;
});

    
