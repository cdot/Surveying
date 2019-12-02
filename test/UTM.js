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
          
    tr.addTest("fromLatLong - 50 0", () => {
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("fromLatLong - 174 0", () => {
        let utm = UTM.fromLatLong(0, -177);
        assert.equal(utm.zone, 1);
        assert.closeTo(utm.east,  500000, EPS);
        assert.closeTo(utm.north,      0, EPS);
    });

    tr.addTest("toLatLong - 50 0", () => {
        let utm = new UTM(285015.76, 5542944.02, 31);
        let ll = utm.toLatLong();
        assert.closeTo(ll.lat, 50, LL_EPS);
        assert.closeTo(ll.lon, 0, LL_EPS);
    });

    tr.addTest("fromLatLong - 50 90", () => {
        let utm = UTM.fromLatLong(50, 90);
        assert.equal(46, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("toLatLong - 50 90", () => {
        let utm = new UTM(285015.76, 5542944.02, 46);
        let ll = utm.toLatLong();
        assert.closeTo(ll.lat,  50, LL_EPS);
        assert.closeTo(ll.lon, 90, LL_EPS);
    });

    tr.addTest("fromLatLong - 50 -6.1", () => {
        utm = UTM.fromLatLong(50, -6.1);
        assert.equal(29, utm.zone);
        assert.closeTo(utm.east, 707819.17, EPS);
        assert.closeTo(utm.north, 5542661.17, EPS);
    });
               
    tr.addTest("fromLatLong - 50 180", () => {
        let utm = UTM.fromLatLong(50, 180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("fromLatLong - 50 -180", () => {
        let utm = UTM.fromLatLong(50, -180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS);
    });

    tr.addTest("fromLatLong - 0 0", () => {
        let utm = UTM.fromLatLong(0, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   166021.44, EPS);
        assert.closeTo(utm.north,       0.00, EPS);
    });
    
    tr.addTest("fromLatLong - 0 90", () => {
        let utm = UTM.fromLatLong(0, 180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.east,   166021.44, EPS);
        assert.closeTo(utm.north,       0.00, EPS);
    });

    tr.addTest("fromLatLong - -50 0", () => {
        let utm = UTM.fromLatLong(-50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,   285015.76, EPS);
        assert.closeTo(utm.north, 4457055.98, EPS); 
    });

    tr.addTest("fromLatLong - NS", () => {
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east,  285015.76, EPS);
        assert.closeTo(utm.north, 5542944.02, EPS); 
        let sutm = UTM.fromLatLong(-50, 0);
        assert.equal(utm.zone, sutm.zone);
        assert.closeTo(sutm.east,  285015.76, EPS);
        assert.closeTo(sutm.north, 4457055.98, EPS); 
    });

    tr.addTest("fromLatLong - adjacent zones", () => {
        
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

    tr.addTest("fromLatLong - adjacent zones", () => {
        // Point in zone 30
        let utm = UTM.fromLatLong(50, -3);
        assert.equal(30, utm.zone);
        assert.closeTo(utm.east, 500000, EPS);
        assert.closeTo(utm.north, 5538630.70, EPS);
        // Force to zone 31
        utm = UTM.fromLatLong(50, -3, 31);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.east, 70134.49, EPS);
        assert.closeTo(utm.north, 5555901.55, EPS);
        let ll = utm.toLatLong();
        assert.closeTo(ll.lat, 50, LL_EPS);
        assert.closeTo(ll.lon, -3, LL_EPS);
    });
               
    tr.run();
});

