let requirejs = require("requirejs");

/*eslint-env node, mocha */
requirejs.config({
    baseUrl: "..",
    paths: {
    }
});

requirejs(["js/Projection"], function(P) {

    const ACC = 0.01;

    function doTest(lat1, lon1, lat2, lon2,
                   expect) {
        let result = P.distanceAndBearing(lat1, lon1, lat2, lon2);
        if (Math.abs(result.distance - expect.d) > ACC ||
            Math.abs(result.bearing1_2 - expect.a) > ACC ||
            Math.abs(result.bearing2_1 - expect.b) > ACC) {
            console.log(lat1, lon1, "->", lat2, lon2, "FAILED");
            console.log(expect);
            console.log(result);
        }
    }
    
    doTest(53.6280529, -2.7398306, 53.6280529, -2.7279204,
           { d:787.9661494524142, a:90, b:270});
    
    doTest(53.6280529, -2.7398306, 53.6340017, -2.7398306,
           { d:662.090218879549, a:0, b:180 });

    doTest(53.6283400, -2.7315400, 53.6301300, -2.7277900,
           { d:318.17926496414316, a:51.23285832668974, b:231.23587780930302 });
});
