/* @copyright 2019 Crawford Currie - All rights reserved */
/*eslint-env node, mocha */

if (typeof module !== "undefined") {
    requirejs = require('requirejs');
}

requirejs.config({
    baseUrl: ".."
});


requirejs(["test/TestRunner", "js/UTM"], function(TestRunner, UTM) {
    let tr = new TestRunner("UTM");
    let assert = tr.assert;

    const EPS = 0.01; // 1cm
    const LL_EPS = 0.000012;
          
    tr.addTest("fromLatLong 1", () => {
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert(!utm.southern);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("fromLatLong 2", () => {
        let utm = UTM.fromLatLong(0, -177);
        assert.equal(utm.zone, 1);
        assert(!utm.southern);
        assert.closeTo(utm.east,  500000, EPS);
        assert.closeTo(utm.north,      0, EPS);
    });

    tr.addTest("toLatLong 1", () => {
        let ll = UTM.toLatLong(285015.76, 5542944.02, 31);
        assert.closeTo(ll.lat, 50, LL_EPS);
        assert.closeTo(ll.lon, 0, LL_EPS);
        ll = UTM.toLatLong({ east: 285015.76, north: 5542944.02, zone: 31});
        assert.closeTo(ll.lat, 50, LL_EPS);
        assert.closeTo(ll.lon, 0, LL_EPS);
    });

    tr.addTest("fromLatLong 3", () => {
        let utm = UTM.fromLatLong(50, 90);
        assert.equal(46, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
        utm = UTM.fromLatLong({lat: 50, lon: 90});
        assert.equal(46, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("toLatLong 2", () => {
        let ll = UTM.toLatLong(285015.76, 5542944.02, 46);
        assert.closeTo(ll.lat,  50, LL_EPS);
        assert.closeTo(ll.lon, 90, LL_EPS);
    });

    tr.addTest("fromLatLong 4", () => {
        let utm = UTM.fromLatLong(50, -6.1);
        assert.equal(29, utm.zone);
        assert.closeTo(utm.east, 707819.17, EPS);
        assert.closeTo(utm.north, 5542661.17, EPS);
    });
               
    tr.addTest("fromLatLong 5", () => {
        let utm = UTM.fromLatLong(50, 179.99);
        assert.equal(utm.zone, 60);
        assert.closeTo(utm.east,   714267.7355984957, EPS);
        assert.closeTo(utm.north, 5542915.301152312, EPS);
    });

    tr.addTest("fromLatLong 6", () => {
        let utm = UTM.fromLatLong(50, -180);
        assert.equal(utm.zone, 1);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("fromLatLong 7", () => {
        let utm = UTM.fromLatLong(0, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   166021.44, EPS);
        assert.closeTo(utm.north,       0.00, EPS);
    });
    
    tr.addTest("fromLatLong 8", () => {
        let utm = UTM.fromLatLong(0, 180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.east,   166021.44, EPS);
        assert.closeTo(utm.north,       0.00, EPS);
    });

    tr.addTest("fromLatLong 9", () => {
        let utm = UTM.fromLatLong(-50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 4457055.98, EPS); 
    });

    tr.addTest("fromLatLong 10", () => {
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,  285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS); 
        let sutm = UTM.fromLatLong(-50, 0);
        assert.equal(utm.zone, sutm.zone);
        assert.closeTo(sutm.east,  285015.76, EPS);
        assert.closeTo(sutm.north, 4457055.98, EPS); 
    });

    tr.addTest("boundary conditions 1", () => {
        let u = { east: UTM.MIN_EASTING, north: UTM.MIN_NORTHING, zone: 30 };
        let ll = UTM.toLatLong(u);
        u = UTM.fromLatLong(ll.lat, ll.lon, 30);
        assert.closeTo(u.east,  UTM.MIN_EASTING, EPS);
        assert.closeTo(u.north, UTM.MIN_NORTHING, EPS); 
    });
    
    tr.addTest("boundary conditions 2", () => {
        let u = { east: UTM.MAX_EASTING, north: UTM.MAX_NORTHING_N, zone: 30 };
        console.log(u);
        let ll = UTM.toLatLong(u);
        console.log(ll);
        u = UTM.fromLatLong(ll.lat, ll.lon, 30);
        assert.closeTo(u.east,  UTM.MAX_EASTING, EPS);
        assert.closeTo(u.north, UTM.MAX_NORTHING_N, EPS); 
     });
    
    tr.addTest("boundary conditions 3", () => {
        let u = { east: UTM.MIN_EASTING, north: UTM.MIN_NORTHING, zone: 30,
                  southern: true};
        let ll = UTM.toLatLong(u);
        u = UTM.fromLatLong(ll.lat, ll.lon, 30);
        assert.closeTo(u.east,  UTM.MIN_EASTING, EPS);
        assert.closeTo(u.north, UTM.MIN_NORTHING, EPS); 
    });
    
    tr.addTest("boundary conditions 4", () => {
        let u = { east: UTM.MAX_EASTING, north: UTM.MAX_NORTHING_S, zone: 30,
                  southern: true };
        console.log(u);
        let ll = UTM.toLatLong(u);
        console.log(ll);
        u = UTM.fromLatLong(ll.lat, ll.lon, 30);
        assert.closeTo(u.east,  UTM.MAX_EASTING, EPS);
        assert.closeTo(u.north, UTM.MAX_NORTHING_S, EPS); 
     });
    
    tr.addTest("adjacent zones 1", () => {
       
        // Point in zone 31
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,  285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
        
        // Point in zone 32, forced to zone 31
        utm = UTM.fromLatLong(50, 6.1, 31);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   722149.18, EPS);
        assert.closeTo(utm.north, 5543236.47, EPS);

        // Point in zone 30, forced to zone 31
        // Will give a range error, because the point is too far
        // outside the zone.
        utm = UTM.fromLatLong(50, -3, 31);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east, 70134.49, EPS);
        assert.closeTo(utm.north, 5555901.55, EPS);
    });

    tr.run();
});

