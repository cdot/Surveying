/* @copyright 2019 Crawford Currie - All rights reserved */
/*eslint-env node, mocha */

if (typeof module !== "undefined") {
    requirejs = require('requirejs');
}

requirejs.config({
    baseUrl: ".."
});


requirejs(["test/TestRunner", "js/UTM", "js/Units"], function(TestRunner, UTM, Units) {
    let tr = new TestRunner("Units");
    let assert = tr.assert;

    const EPS = 0.01; // 1cm
    const LL_EPS = 0.000012;

    tr.addTest("IN -> UTM", () => {
        Units.inOrigin = { east: 5050, north: 7070, zone: 30, hemis: 'N' };
        let u = Units.convert(Units.IN, { x: 0, y: 0, z: 0 }, Units.UTM);
        console.log(u);
        assert.equal(u.east, 5050);
        assert.equal(u.north, 7070);
        assert.equal(u.zone, 30);     
        assert.equal(u.hemis, 'N');     
        u = Units.convert(Units.IN, { x: 1, y: 1, z: 0 }, Units.UTM);
        assert.equal(u.east, 5050.001);
        assert.equal(u.north, 7070.001);
        assert.equal(u.zone, 30);     
        assert.equal(u.hemis, 'N');     

        Units.inOrigin = { east: 5050, north: 7070, zone: 30, hemis: 'S' };
        u = Units.convert(Units.IN, { x: 0, y: 0, z: 0 }, Units.UTM);
        assert.equal(u.east, 5050);
        assert.equal(u.north, 7070);
        assert.equal(u.zone, 30);     
        assert.equal(u.hemis, 'S');     
        u = Units.convert(Units.IN, { x: 1, y: 1, z: 0 }, Units.UTM);
        assert.equal(u.east, 5050.001);
        assert.equal(u.north, 7070.001);
        assert.equal(u.zone, 30);     
        assert.equal(u.hemis, 'S');     
    });
  
    tr.addTest("UTM -> IN", () => {
        debugger;
        Units.inOrigin = { east: 5050, north: 7070, zone: 30 };
        let u = Units.convert(
            Units.UTM, { east: 0, north: 0, zone: 30 }, Units.IN);
        assert.equal(u.x, -5050000);
        assert.equal(u.y, -7070000);
        assert.equal(u.z, 0);
    });

    tr.addTest("LONLAT -> UTM", () => {
        delete Units.inOrigin;
        let u = Units.convert(Units.LONLAT, { lon: -177, lat: 53 }, Units.UTM);
        let utm = UTM.fromLatLong(53, -177);
        assert.equal(u.zone, utm.zone);
        assert.equal(u.east, utm.east);
        assert.equal(u.north, utm.north);
    });
               
    tr.addTest("UTM -> LONLAT", () => {
        delete Units.inOrigin;
        let utm = { east: 285015.76, north: 5542944.02, zone: 31};
        let u = Units.convert(Units.UTM, utm, Units.LONLAT);
        assert.closeTo(u.lat, 50, LL_EPS);
        assert.closeTo(u.lon, 0, LL_EPS);
    });

    tr.addTest("IN -> EX", () => {
        Units.inOrigin = { x: 5050, y: 7070, z: 30 };

        // 10m^2
        Units.mapToEX(
            {
                min: { x:     0, y:     0, z: 0 },
                max: { x: 10000, y: 10000, z: 0 }
            },
            25); // units per m
        let u = Units.convert(Units.IN, { x: 0, y: 0, z: 0 }, Units.EX);
        assert.equal(u.x, 0);
        assert.equal(u.y, 250);
        u = Units.convert(Units.IN, { x: 10000, y: 10000, z: 0 }, Units.EX);
        assert.equal(u.x, 250);
        assert.equal(u.y, 0);
    });
    
    tr.run();
});
