define("js/GC", function() {

    /**
     * Great Circle calculator
     */
    
    // Ported from http://edwilliams.org/gccalc.htm
    // Vicenty's original paper at https://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf
    
    // invf: 1/f, f=flattening of the ellipsoid
    // See https://en.wikipedia.org/wiki/World_Geodetic_System
    const R = 6378137;
    const INVF = 1 / 298.257223563;

    /**
     * atan protected against input edge cases
     */
    function _atan2(y, x) {
        if (x === 0) {
            if (y > 0) return Math.PI / 2;
            if (y < 0) return 3 * Math.PI / 2;
            throw new Error("_atan2(0,0) undefined")
        }
        if (x < 0)
            return Math.atan(y / x) + Math.PI;
        // x > 0
        if (y >= 0)
            return Math.atan(y / x);
        // y < 0
        return Math.atan(y / x) + 2 * Math.PI;
    }

    // Bring a bearing into the range 0..2*PI
    function _modBearing(x) {
        return x - 2 * Math.PI * Math.floor(x / (2 * Math.PI));
    }

    function _deg2rad(d) {
        return d * Math.PI / 180;
    }
    
    function _rad2deg(r) {
        return 180 * r / Math.PI;
    }
    
    let GC = {};
    
    /**
     * Compute the distance and bearing between two points given by
     * latitude and longitude
     * @param lat1 initial geodetic latitude in degrees N positive 
     * @param lon1 initial geodetic longitude in degrees E positive 
     * @param lat2 final geodetic latitude in degrees N positive 
     * @param lon2 final geodetic longitude in degrees E positive 
     * @param {String} model coordinate model, default "WGS84"
     * @return {
     *    distance: in metres
     *    bearing1_2: great circle bearing from first to second in degrees
     *    bearing2_1: great circle bearing from first to second in degrees
     * }
     * @throw Error
     */
    GC.distanceAndBearing = (lat1, lon1, lat2, lon2, model) => {
        let phi1 = _deg2rad(lat1);
        let L1   = _deg2rad(lon1);
        let phi2 = _deg2rad(lat2);
        let L2   = _deg2rad(lon2);
        
        if (!model)
            model = "WGS84";

        let a = R;
        let f = INVF;
        
        const EPS = 10e-11; // close enough
        const MAXITER = 100;
        
        if ((phi1 + phi2 == 0) && (Math.abs(L1 - L2) == Math.PI))
            throw new Error("Course and distance between antipodal points is undefined");

        if (phi1 == phi2
            && (L1 == L2 || Math.abs(Math.abs(L1 - L2) - 2 * Math.PI) < EPS))
            throw new Error("Points are identical")

        // See https://en.wikipedia.org/wiki/Vincenty%27s_formulae
        let r = 1 - f;
        
        // U1, U2 reduced latitudes (latitude on the auxiliary sphere)
        let tU1 = r * Math.tan(phi1);
        let tU2 = r * Math.tan(phi2);
        let cU1 = 1 / Math.sqrt (1 + tU1 * tU1);
        let cU2 = 1 / Math.sqrt (1 + tU2 * tU2);
        let sU1 = cU1 * tU1;

        let cU1cU2 = cU1 * cU2;
        let cU1cU2tU2 = cU1cU2 * tU2;
        let cU1cU2tU2tU1 = cU1cU2tU2 * tU1;
        let L = L2 - L1;
        let lambda = L;
        let lastLambda = lambda + 1; // force one pass of the iteration
        
        let sLambda, cLambda, sSigma, cSigma, sigma, c2Alpha, cSigmaM2, e;
        let iteration = 0;
        do {
            sLambda = Math.sin(lambda);
            cLambda = Math.cos(lambda);
            tU1 = cU2 * sLambda;
            tU2 = cU1cU2tU2 - sU1 * cU2 * cLambda;
            sSigma = Math.sqrt(tU1 * tU1 + tU2 * tU2);
            cSigma = cU1cU2 * cLambda + cU1cU2tU2tU1;
            sigma = _atan2(sSigma, cSigma);
            let sAlpha = cU1cU2 * sLambda / sSigma;
            c2Alpha = 1 - sAlpha * sAlpha;
            cSigmaM2 = 2 * cU1cU2tU2tU1;
            if (c2Alpha > 0)
                cSigmaM2 = cSigma - cSigmaM2 / c2Alpha;
            e = 2 * cSigmaM2 * cSigmaM2 - 1;
            let c = ((-3 * c2Alpha + 4) * f + 4) * c2Alpha * f / 16;          
            lastLambda = lambda;
            lambda = ((e * cSigma * c + cSigmaM2) * sSigma * c + sigma) * sAlpha;
            lambda = (1 - c) * lambda * f + L;
            if (iteration++ >= MAXITER)
                throw new Error("Algorithm did not converge");
            //console.log("iter", iteration, Math.abs(lastLambda - lambda));
        } while (Math.abs(lastLambda - lambda) > EPS);

        lambda = Math.sqrt((1 / (r * r) - 1) * c2Alpha + 1);
        lambda++;
        lambda = (lambda - 2) / lambda;
        let t1 = (lambda * lambda / 4 + 1) / (1 - lambda);
        let t2 = (0.375 * lambda * lambda - 1) * lambda;
        lambda = e * cSigma;
        
        // Ellipsoidal distance in metres
        let s = ((((sSigma * sSigma * 4 - 3) * (1 - e - e) * cSigmaM2 * t2 / 6 - lambda)
                 * t2 / 4 + cSigmaM2) * sSigma * t2 + sigma) * t1 * a * r;
        let alpha1 = _atan2(tU1, tU2);
        let alpha2 = _atan2(cU1 * sLambda, cU1cU2tU2 * cLambda - sU1 * cU2) + Math.PI;
        return {
            bearing1_2: _rad2deg(_modBearing(alpha1)),
            bearing2_1: _rad2deg(_modBearing(alpha2)),
            distance: s
        };
    };

    return GC;
});

