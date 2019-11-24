/* @copyright 2019 Crawford Currie - ALl rights reserved */
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
          
    tr.deTest("fromLatLong - 50 0", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,   285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS);
        assert.equal(31, UTM.defaultZone());
    });

    tr.addTest("toLatLong - 50 0", () => {
        let utm = new UTM(285015.76, 5542944.02, 31);
        let ll = utm.toLatLong();
        assert.closeTo(ll.latitude, 50, LL_EPS);
        assert.closeTo(ll.longitude, 0, LL_EPS);
    });

    tr.deTest("fromLatLong - 50 90", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(50, 90);
        assert.equal(46, utm.zone);
        assert.closeTo(utm.easting,   285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS);
        assert.equal(46, UTM.defaultZone());
    });

    tr.addTest("toLatLong - 50 90", () => {
        let utm = new UTM(285015.76, 5542944.02, 46);
        let ll = utm.toLatLong();
        assert.closeTo(ll.latitude,  50, LL_EPS);
        assert.closeTo(ll.longitude, 90, LL_EPS);
    });

    tr.addTest("fromLatLong - 50 -6.1", () => {
        UTM.resetDefaultZone();
        utm = UTM.fromLatLong(50, -6.1);
        assert.equal(29, utm.zone);
        assert.closeTo(utm.easting, 707819.17, EPS);
        assert.closeTo(utm.northing, 5542661.17, EPS);
    });
               
    tr.deTest("fromLatLong - 50 180", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(50, 180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.easting,   285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS);
        assert.equal(1, UTM.defaultZone());
    });

    tr.deTest("fromLatLong - 50 -180", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(50, -180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.easting,   285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS);
        assert.equal(1, UTM.defaultZone());
    });

    tr.deTest("fromLatLong - 0 0", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(0, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,   166021.44, EPS);
        assert.closeTo(utm.northing,       0.00, EPS);
    });
    
    tr.deTest("fromLatLong - 0 90", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(0, 180);
        assert.equal(1, utm.zone);
        assert.closeTo(utm.easting,   166021.44, EPS);
        assert.closeTo(utm.northing,       0.00, EPS);
    });

    tr.deTest("fromLatLong - -50 0", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(-50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,   285015.76, EPS);
        assert.closeTo(utm.northing, 4457055.98, EPS); 
    });

    tr.deTest("fromLatLong - NS", () => {
        UTM.resetDefaultZone();
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,  285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS); 
        let sutm = UTM.fromLatLong(-50, 0);
        assert.equal(utm.zone, sutm.zone);
        assert.closeTo(sutm.easting,  285015.76, EPS);
        assert.closeTo(sutm.northing, 4457055.98, EPS); 
    });

    tr.addTest("fromLatLong - adjacent zones", () => {
        UTM.resetDefaultZone();
        
        // Point in zone 31
        let utm = UTM.fromLatLong(50, 0);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,  285015.76, EPS);
        assert.closeTo(utm.northing, 5542944.02, EPS);
        
        // Point in zone 32, forced to zone 31
        utm = UTM.fromLatLong(50, 6.1);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting,   722149.18, EPS);
        assert.closeTo(utm.northing, 5543236.47, EPS);

        // Point in zone 30, forced to zone 31
        // Will give a range error, because the point is too far
        // outside the zone.
        utm = UTM.fromLatLong(50, -3);
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting, 70134.49, EPS);
        assert.closeTo(utm.northing, 5555901.55, EPS);
    });

    tr.addTest("fromLatLong - adjacent zones", () => {
        UTM.resetDefaultZone();
        // Point in zone 30
        utm = UTM.fromLatLong(50, -3);
        assert.equal(30, utm.zone);
        assert.closeTo(utm.easting, 500000, EPS);
        assert.closeTo(utm.northing, 5538630.70, EPS);
        // Force to zone 31
        UTM.setDefaultZone(31);
        utm.toDefaultZone();
        assert.equal(31, utm.zone);
        assert.closeTo(utm.easting, 70134.49, EPS);
        assert.closeTo(utm.northing, 5555901.55, EPS);
        let ll = utm.toLatLong();
        assert.closeTo(ll.latitude, 50, LL_EPS);
        assert.closeTo(ll.longitude, -3, LL_EPS);
    });
               
    tr.run();
});

