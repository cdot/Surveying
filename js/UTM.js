define("js/UTM", function() {

    const R = 6378137;
    const K0 = 0.9996;

    const E = 0.00669438;
    const E2 = E * E;
    const E3 = E2 * E;
    const E_P2 = E / (1 - E);

    const SQRT_E = Math.sqrt(1 - E);
    const _E = (1 - SQRT_E) / (1 + SQRT_E);
    const _E2 = Math.pow(_E, 2);
    const _E3 = Math.pow(_E, 3);
    const _E4 = Math.pow(_E, 4);
    const _E5 = Math.pow(_E, 5);

    const M1 = 1 - E / 4 - 3 * E2 / 64 - 5 * E3 / 256;
    const M2 = 3 * E / 8 + 3 * E2 / 32 + 45 * E3 / 1024;
    const M3 = 15 * E2 / 256 + 45 * E3 / 1024;
    const M4 = 35 * E3 / 3072;

    const P2 = 3 / 2 * _E - 27 / 32 * _E3 + 269 / 512 * _E5;
    const P3 = 21 / 16 * _E2 - 55 / 32 * _E4;
    const P4 = 151 / 96 * _E3 - 417 / 128 * _E5;
    const P5 = 1097 / 512 * _E4;

    // Bands A, B, Y and Z represent Antarctic and Artic respectively,
    // and are not supported
    const BAND_LETTERS = 'CDEFGHJKLMNPQRSTUVWXX';

    function latitudeToBand(latitude) {
        if (-80 <= latitude && latitude <= 84) {
            return BAND_LETTERS[Math.floor((latitude + 80) / 8)];
        } else {
            return null;
        }
    }

    function latLonToZone(latitude, longitude) {
        if (56 <= latitude && latitude < 64 && 3 <= longitude && longitude < 12) return 32;

        if (72 <= latitude && latitude <= 84 && longitude >= 0) {
            if (longitude <  9) return 31;
            if (longitude < 21) return 33;
            if (longitude < 33) return 35;
            if (longitude < 42) return 37;
        }

        return Math.floor((longitude + 180) / 6) + 1;
    }

    function zoneToCentralLongitude(zoneNum) {
        return (zoneNum - 1) * 6 - 180 + 3;
    }

    function _deg2rad(d) {
        return d * Math.PI / 180;
    }
    
    function _rad2deg(r) {
        return 180 * r / Math.PI;
    }

    /**
     * A position in UTM coordinates. 
     */
    class UTM {
        /**
         * @param easting
         * @param northing
         * @param zone longitude zone
         * @param band latitude band
         */
        constructor(easting, northing, zone, band) {
            if (easting < 100000 || 1000000 <= easting)
                throw new RangeError('easting must be between 100000 and 999999');
            this.easting = easting;

            if (northing < 0 || northing > 10000000)
                throw new RangeError('northing must be between 0 and 10000000');
            this.northing = northing;

            if (zone < 1 || zone > 60)
                throw new RangeError('zone must be between 1 and 60');
            this.zone = zone;

            if (BAND_LETTERS.indexOf(band) < 0)
                throw new RangeError('band out of range (must be between C and X)');
            this.band = band;
        }

        get isNorthern() { return /[N-Z]/.test(this.band); }

        /**
         * Convert a position in UTM to WGS84
         * @param {UTM} utm position.
         * @return {
         *     latitude: degrees
         *     longitude: degrees
         * };
         */
        toLatLong() {

            let x = this.easting - 500000;
            let y = this.northing;

            if (!this.isNorthern) y -= 1e7;

            let m = y / K0;
            let mu = m / (R * M1);

            let pRad = mu +
                P2 * Math.sin(2 * mu) +
                P3 * Math.sin(4 * mu) +
                P4 * Math.sin(6 * mu) +
                P5 * Math.sin(8 * mu);

            let pSin = Math.sin(pRad);
            let pSin2 = Math.pow(pSin, 2);

            let pCos = Math.cos(pRad);

            let pTan = Math.tan(pRad);
            let pTan2 = Math.pow(pTan, 2);
            let pTan4 = Math.pow(pTan, 4);

            let epSin = 1 - E * pSin2;
            let epSinSqrt = Math.sqrt(epSin);

            let n = R / epSinSqrt;
            let r = (1 - E) / epSin;

            let c = _E * pCos * pCos;
            let c2 = c * c;

            let d = x / (n * K0);
            let d2 = d * d;
            let d3 = d2 * d;
            let d4 = d3 * d;
            let d5 = d4 * d;
            let d6 = d5 * d;

            let latitude = pRad - (pTan / r) *
                (d2 / 2 -
                 d4 / 24 * (5 + 3 * pTan2 + 10 * c - 4 * c2 - 9 * E_P2)) +
                d6 / 720 * (61 + 90 * pTan2 + 298 * c + 45 * pTan4 - 252 * E_P2 - 3 * c2);
            let longitude = (d -
                             d3 / 6 * (1 + 2 * pTan2 + c) +
                             d5 / 120 * (5 - 2 * c + 28 * pTan2 - 3 * c2 + 8 * E_P2 + 24 * pTan4)) / pCos;

            return {
                latitude: _rad2deg(latitude),
                longitude: _rad2deg(longitude) + zoneToCentralLongitude(this.zone)
            };
        }

        /**
         * Parse UTM string. The easting and northing must be separated by
         * a space. Latitude band letters are always interpreted as band
         * letters, use "North" or "South" for hemispheres.
         */
        static fromString(s) {
            let m = /^([0-9]+\s*([A-Z]|North|South)\s*([0-9]+)\s+([0-9]+)$/.match(s);
            
            if (!m)
                throw new Error("Bad UTM string " + s);
            return new UTM(
                parseFloat(m[3]),
                parseFloat(m[4]),
                m[1],
                (m[2] === "North") ? 'N' : ((m[2] === "South") ? "M" : m[2]));
        }

        /**
         * Note: max resolution of a UTM string is 1M
         */
        toString() {
            return this.zone + this.band + Math.trunc(easting)
            + " " + Math.trunc(northing);
        }
        
        /**
         * Convert a lat/long into a UTM coordinate
         * @param latitude decimal degrees
         * @param longitude decimal degrees
         * @param forceZone Optional, override computed zone
         * @return {UTM} coordinate
         */
        static fromLatLong(latitude, longitude, forceZone) {
            if (latitude > 84 || latitude < -80)
                throw new RangeError('latitude must be between -80 and 84');

            if (longitude > 180 || longitude < -180)
                throw new RangeError('longitude must be between -180 and 180');

            let latRad = _deg2rad(latitude);
            let latSin = Math.sin(latRad);
            let latCos = Math.cos(latRad);

            let latTan = Math.tan(latRad);
            let latTan2 = Math.pow(latTan, 2);
            let latTan4 = Math.pow(latTan, 4);

            let zoneNum = forceZone || latLonToZone(latitude, longitude);
            let zoneLetter = latitudeToBand(latitude);

            let lonRad = _deg2rad(longitude);
            let centralLon = zoneToCentralLongitude(zoneNum);
            let centralLonRad = _deg2rad(centralLon);

            let n = R / Math.sqrt(1 - E * latSin * latSin);
            let c = E_P2 * latCos * latCos;

            let a = latCos * (lonRad - centralLonRad);
            let a2 = Math.pow(a, 2);
            let a3 = Math.pow(a, 3);
            let a4 = Math.pow(a, 4);
            let a5 = Math.pow(a, 5);
            let a6 = Math.pow(a, 6);

            let m = R * (M1 * latRad -
                         M2 * Math.sin(2 * latRad) +
                         M3 * Math.sin(4 * latRad) -
                         M4 * Math.sin(6 * latRad));
            let easting = K0 * n
                * (a + a3 / 6 * (1 - latTan2 + c) +
                   a5 / 120 * (5 - 18 * latTan2 + latTan4 + 72 * c - 58 * E_P2)) + 500000;
            let northing = K0 * (m + n * latTan
                                 * (a2 / 2 +
                                    a4 / 24 * (5 - latTan2 + 9 * c + 4 * c * c) +
                                    a6 / 720 * (61 - 58 * latTan2
                                                + latTan4 + 600 * c - 330 * E_P2)));
            if (latitude < 0) northing += 1e7;

            return new UTM(easting, northing, zoneNum, zoneLetter);
        }
    }

    return UTM;
});
       
