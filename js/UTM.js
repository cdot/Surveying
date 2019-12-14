/* @copyright 2019 Crawford Currie - All rights reserved */
/* Portions @copyright 1997-1998 by Charles L. Taylor */
define("js/UTM", function() {

    /**
     * The point of origin of each UTM zone is the intersection of the
     * equator and the zone's central meridian. To avoid dealing with
     * negative numbers, the central meridian of each zone is defined
     * to coincide with 500000 meters East. UTM eastings range from
     * about 167000 meters to 833000 meters at the equator.
     *
     * In the northern hemisphere positions are measured northward
     * from zero at the equator. The maximum "northing" value is about
     * 9300000 meters at latitude 84 degrees North, the north end of
     * the UTM zones. In the southern hemisphere northings decrease
     * southward from the equator to about 1100000 meters at 80
     * degrees South, the south end of the UTM zones. The northing at
     * the equator is set at 10000000 meters so no point has a
     * negative northing value.
     */

    /* Ellipsoid model constants (actual values here are for WGS84) */
    const sm_a = 6378137;
    const sm_b = 6356752.314;

    const UTMScaleFactor = 0.9996;

    /**
     * Converts degrees to radians.
     */
    function deg2rad(deg) {
        return deg / 180 * Math.PI;
    }

    /**
     * Converts radians to degrees.
     */
    function rad2deg(rad) {
        return rad / Math.PI * 180;
    }

    /**
     * Work out what UTM zone a given lat/lon is in
     */
    function latLonToZone(lat, lon) {
        if (72 <= lat && lat <= 84 && lon >= 0) {
            if (lon <  9) return 31;
            if (lon < 21) return 33;
            if (lon < 33) return 35;
            if (lon < 42) return 37;
        }
        let z = Math.floor((lon + 180) / 6) + 1;
        if (z > 60) z -= 60;
        return z;
    }

    /**
     * Computes the ellipsoidal distance from the equator to a point at a
     * given latitude.
     *
     * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
     * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
     *
     * @param phi Latitude of the point, in radians.
     *
     * Globals:
     *     sm_a - Ellipsoid model major axis.
     *     sm_b - Ellipsoid model minor axis.
     *
     * @return The ellipsoidal distance of the point from the equator,
     * in meters.
     */
    function arcLengthOfMeridian(phi) {
        // Precalculate n
        let n = (sm_a - sm_b) / (sm_a + sm_b);

        // Precalculate alpha
        let alpha = ((sm_a + sm_b) / 2)
           * (1 + (Math.pow(n, 2) / 4) + (Math.pow(n, 4) / 64));

        // Precalculate beta
        let beta = (-3 * n / 2) + (9 * Math.pow(n, 3) / 16)
           + (-3 * Math.pow(n, 5) / 32);

        // Precalculate gamma
        let gamma = (15 * Math.pow(n, 2) / 16)
            + (-15 * Math.pow(n, 4) / 32);
    
        // Precalculate delta
        let delta = (-35 * Math.pow(n, 3) / 48)
            + (105 * Math.pow(n, 5) / 256);
    
        // Precalculate epsilon
        let epsilon = (315 * Math.pow(n, 4) / 512);
    
        // Now calculate the sum of the series and return
        return alpha
        * (phi + (beta * Math.sin(2 * phi))
           + (gamma * Math.sin(4 * phi))
           + (delta * Math.sin(6 * phi))
           + (epsilon * Math.sin(8 * phi)));
    }

    /**
     * Determines the central meridian for the given UTM zone.
     * @param zone An integer value designating the UTM zone, range [1,60].
     * @return The central meridian for the given UTM zone, in
     * radians, or zero if the UTM zone parameter is outside the
     * range [1,60].  Range of the central meridian is the radian
     * equivalent of [-177,+177].
     */
    function centralUTMMeridian(zone) {
        return deg2rad(-183 + (zone * 6));
    }

    /**
     * Computes the footpoint latitude for use in converting transverse
     * Mercator coordinates to ellipsoidal coordinates.
     *
     * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
     * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
     *
     * @param y The UTM northing coordinate, in meters.
     * @return The footpoint latitude, in radians.
     */
    function footpointLatitude(y) {
        // Precalculate n (Eq. 10.18)
        let n = (sm_a - sm_b) / (sm_a + sm_b);

        // Precalculate alpha_ (Eq. 10.22)
        // (Same as alpha in Eq. 10.17)
        let alpha_ = ((sm_a + sm_b) / 2)
            * (1 + (Math.pow(n, 2) / 4) + (Math.pow(n, 4) / 64));

        // Precalculate y_ (Eq. 10.23)
        let y_ = y / alpha_;

        // Precalculate beta_ (Eq. 10.22)
        let beta_ = (3 * n / 2) + (-27 * Math.pow(n, 3) / 32)
            + (269 * Math.pow(n, 5) / 512);

        // Precalculate gamma_ (Eq. 10.22)
        let gamma_ = (21 * Math.pow(n, 2) / 16)
            + (-55 * Math.pow(n, 4) / 32);

        // Precalculate delta_ (Eq. 10.22)
        let delta_ = (151 * Math.pow(n, 3) / 96)
            + (-417 * Math.pow(n, 5) / 128);

        // Precalculate epsilon_ (Eq. 10.22)
        let epsilon_ = (1097 * Math.pow(n, 4) / 512);

        // Now calculate the sum of the series (Eq. 10.21)
        return y_ + (beta_ * Math.sin(2 * y_))
        + (gamma_ * Math.sin(4 * y_))
        + (delta_ * Math.sin(6 * y_))
        + (epsilon_ * Math.sin(8 * y_));
    }

    /**
     * Converts a latitude/longitude pair to x and y coordinates in the
     * Transverse Mercator projection.  Note that Transverse Mercator is not
     * the same as UTM; a scale factor is required to convert between them.
     *
     * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
     * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
     *
     * @param phi Latitude of the point, in radians.
     * @param lambda Longitude of the point, in radians.
     * @param lambda0 Longitude of the central meridian to be used, in radians.
     * @return the coordinates of the computed point as {east, north}
     */
    function mapLatLonToXY(phi, lambda, lambda0) {
        // Precalculate ep2
        let ep2 = (Math.pow(sm_a, 2) - Math.pow(sm_b, 2))
            / Math.pow(sm_b, 2);
    
        // Precalculate nu2
        let nu2 = ep2 * Math.pow(Math.cos(phi), 2);
    
        // Precalculate N
        let N = Math.pow(sm_a, 2) / (sm_b * Math.sqrt (1 + nu2));
    
        // Precalculate t
        let t = Math.tan(phi);
        let t2 = t * t;

        // Precalculate l
        let l = lambda - lambda0;
    
        // Precalculate coefficients for l**n in the equations below
        // so a normal human being can read the expressions for easting
        // and northing
        // -- l**1 and l**2 have coefficients of 1
        let l3coef = 1 - t2 + nu2;

        let l4coef = 5 - t2 + 9 * nu2 + 4 * (nu2 * nu2);
    
        let l5coef = 5 - 18 * t2 + (t2 * t2) + 14 * nu2
            - 58 * t2 * nu2;
    
        let l6coef = 61 - 58 * t2 + (t2 * t2) + 270 * nu2
            - 330 * t2 * nu2;
    
        let l7coef = 61 - 479 * t2 + 179 * (t2 * t2) - (t2 * t2 * t2);
    
        let l8coef = 1385 - 3111 * t2 + 543 * (t2 * t2) - (t2 * t2 * t2);
    
        // Calculate easting
        return {
            east: N * Math.cos(phi) * l
            + (N / 6 * Math.pow(Math.cos(phi), 3) * l3coef * Math.pow(l, 3))
            + (N / 120 * Math.pow(Math.cos(phi), 5) * l5coef * Math.pow(l, 5))
            + (N / 5040 * Math.pow(Math.cos(phi), 7) * l7coef * Math.pow(l, 7)),
    
            // Calculate northing
            north: arcLengthOfMeridian(phi)
            + (t / 2 * N * Math.pow(Math.cos(phi), 2) * Math.pow(l, 2))
            + (t / 24 * N * Math.pow(Math.cos(phi), 4) * l4coef * Math.pow(l, 4))
            + (t / 720 * N * Math.pow(Math.cos(phi), 6) * l6coef * Math.pow(l, 6))
            + (t / 40320 * N * Math.pow(Math.cos(phi), 8) * l8coef * Math.pow(l, 8))
        }
    }
    
    /**
     * Converts x and y coordinates in the Transverse Mercator projection to
     * a latitude/longitude pair.  Note that Transverse Mercator is not
     * the same as UTM; a scale factor is required to convert between them.
     *
     * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
     * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
     *
     * @param x The easting of the point, in meters.
     * @param y The northing of the point, in meters.
     * @param lambda0 Longitude of the central meridian to be used, in radians.
     * @return postition as {lat, lon} in radians.
     */
    function mapXYToLatLon(x, y, lambda0) {
        // The local variables Nf, nuf2, tf, and tf2 serve the same
        // purpose as N, nu2, t, and t2 in mapLatLonToXY, but they are
        // computed with respect to the footpoint latitude phif.
        // x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
        // to optimize computations.

        // Get the value of phif, the footpoint latitude.
        let phif = footpointLatitude(y);

        // Precalculate ep2
        let ep2 = (Math.pow(sm_a, 2) - Math.pow(sm_b, 2))
              / Math.pow(sm_b, 2);

        // Precalculate cos(phif)
        let cf = Math.cos(phif);

        // Precalculate nuf2
        let nuf2 = ep2 * Math.pow(cf, 2);

        // Precalculate Nf and initialize Nfpow
        let Nf = Math.pow(sm_a, 2) / (sm_b * Math.sqrt (1 + nuf2));
        let Nfpow = Nf;

        // Precalculate tf
        let tf = Math.tan(phif);
        let tf2 = tf * tf;
        let tf4 = tf2 * tf2;
        
        // Precalculate fractional coefficients for x**n in the equations
        // below to simplify the expressions for latitude and longitude.
        let x1frac = 1 / (Nfpow * cf);
        
        Nfpow *= Nf;   // now equals Nf**2)
        let x2frac = tf / (2 * Nfpow);
        
        Nfpow *= Nf;   // now equals Nf**3)
        let x3frac = 1 / (6 * Nfpow * cf);
        
        Nfpow *= Nf;   // now equals Nf**4)
        let x4frac = tf / (24 * Nfpow);
        
        Nfpow *= Nf;   // now equals Nf**5)
        let x5frac = 1 / (120 * Nfpow * cf);
        
        Nfpow *= Nf;   // now equals Nf**6)
        let x6frac = tf / (720 * Nfpow);
        
        Nfpow *= Nf;   // now equals Nf**7)
        let x7frac = 1 / (5040 * Nfpow * cf);
        
        Nfpow *= Nf;   // now equals Nf**8)
        let x8frac = tf / (40320 * Nfpow);
        
        // Precalculate polynomial coefficients for x**n.
        // -- x**1 does not have a polynomial coefficient.
        let x2poly = -1 - nuf2;
        
        let x3poly = -1 - 2 * tf2 - nuf2;
        
        let x4poly = 5 + 3 * tf2 + 6 * nuf2 - 6 * tf2 * nuf2
            - 3 * (nuf2 * nuf2) - 9 * tf2 * (nuf2 * nuf2);
        
        let x5poly = 5 + 28 * tf2 + 24 * tf4 + 6 * nuf2 + 8 * tf2 * nuf2;
        
        let x6poly = -61 - 90 * tf2 - 45 * tf4 - 107 * nuf2
            + 162 * tf2 * nuf2;
        
        let x7poly = -61 - 662 * tf2 - 1320 * tf4 - 720 * (tf4 * tf2);
        
        let x8poly = 1385 + 3633 * tf2 + 4095 * tf4 + 1575 * (tf4 * tf2);

        // Calculate latitude
        return {
            lat: phif + x2frac * x2poly * (x * x)
            + x4frac * x4poly * Math.pow(x, 4)
            + x6frac * x6poly * Math.pow(x, 6)
            + x8frac * x8poly * Math.pow(x, 8),

            // Calculate longitude
            lon: lambda0 + x1frac * x
            + x3frac * x3poly * Math.pow(x, 3)
            + x5frac * x5poly * Math.pow(x, 5)
            + x7frac * x7poly * Math.pow(x, 7)
        };
    }

    /**
    * Converts a latitude/longitude pair to x and y coordinates in the
    * Universal Transverse Mercator projection.
    *
    * @param lat Latitude of the point, in radians.
    * @param lon Longitude of the point, in radians.
    * @param zone UTM zone to be used for calculating values for x and y.
    *          If zone is less than 1 or greater than 60, the routine
    *          will determine the appropriate zone from the value of lon.
    * @return Structure { x, y, zone }
    */
    function latLonToUTM(lat, lon, zone) {
        let xy = mapLatLonToXY(lat, lon, centralUTMMeridian (zone));

        // Adjust easting and northing for UTM system.
        xy.east = xy.east * UTMScaleFactor + 500000;
        xy.north *= UTMScaleFactor;
        if (xy.north < 0) {
            xy.north += 10000000;
            xy.southern = true;
        } else
            xy.southern = false;
        xy.zone = zone;
        
        return xy;
    }
  
    let UTM = {

        // Extremes
        MIN_EASTING:    100000,
        MAX_EASTING:    1000000,
        
        MIN_NORTHING:   0,
        MAX_NORTHING_S: 10000000, // Equator
        MAX_NORTHING_N: 9300000,  // 84N
        
        /**
         * Converts x and y coordinates in the Universal Transverse Mercator
         * projection to a latitude/longitude pair.
         * @param easting
         * @param northing
         * @param zone longitude zone
         * @param southern true for southern hemisphere
         * Parameters can be passed individually or wrapped in an object
         * (east, north, zone, southern)
         * @return lat/lon of the point, as {lat, lon} degrees
         */
        toLatLong: (easting, northing, zone, southern) => {

            if (typeof easting === "object") {
                southern = easting.southern;
                zone = easting.zone;
                northing = easting.north;
                easting = easting.east;
            }
            
            if (easting < UTM.MIN_EASTING || easting > UTM.MAX_EASTING) {
                throw new RangeError(
                    `UTM easting ${easting} outside ${UTM.MIN_EASTING}..${UTM.MAX_EASTING}`);
            }

            let max = southern ? UTM.MAX_NORTHING_S : UTM.MAX_NORTHING_N;
            if (northing < UTM.MIN_NORTHING || northing > max) {
                throw new RangeError(
                    `UTM northing ${northing} outside ${UTM.MIN_NORTHING}..${max}`);
            }
            
            if (!zone || zone < 1 || zone > 60) {
                throw new RangeError(`zone ${zone} outside 1..60`);
            }

            easting = (easting - 500000) / UTMScaleFactor;

            /* If in southern hemisphere, adjust accordingly. */
            if (southern)
                northing -= 10000000;

            northing /= UTMScaleFactor;
        
            let ll = mapXYToLatLon(easting, northing, centralUTMMeridian(zone));
            if (ll.lon < -Math.PI)
                ll.lon += 2 * Math.PI;
            else if (ll.lon > Math.PI)
                ll.lon -= 2 * Math.PI;
            
            return {
                lat: rad2deg(ll.lat),
                lon: rad2deg(ll.lon)
            };
        },

        /**
         * Convert a lat/long into a UTM coordinate latitude,longitude
         * can be passed as {lat,lon} in the first parameter.
         * @param lat latitude decimal degrees
         * @param lon longitude decimal degrees
         * @param forceZone Optional, override computed zone
         * @return coordinate {east, north, zone, southern }
         */
        fromLatLong: (lat, lon, forceZone) => {
            if (typeof lat === "object") {
                forceZone = lon;
                lon = lat.lon;
                lat = lat.lat;
            }
            if (lat > 84 || lat < -80)
                throw new RangeError(`latitude -80<=${lat}<=84`);

            if (lon > 180 || lon < -180)
                throw new RangeError(`longitude -180<=${lon}<=180`);

            if (lon === 180)
                lon = -180; // special case
            
            let zone = forceZone || latLonToZone(lat, lon);
            return latLonToUTM(deg2rad(lat), deg2rad(lon), zone);
        }
    }

    return UTM;
});
       
