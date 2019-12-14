/* @copyright 2019 Crawford Currie - All rights reserved */
define("js/Units", ["js/UTM"], function(UTM) {

    /**
     * Conversions between different unit systems.
     *
     * 4 unit systems are supported
     * 1. Lat/Long (x=lat, y=long) decimal degrees
     * 2. UTM (x=easting, y=northing, z=zone) metres
     * 3. Internal units (x, y, z), millimetres relative to an
     *    origin expressed as a UTM coordinate
     * 4. External units, y axis is flipped
     *
     * External units requires the setting up of a mapping to/from these units.
     * For transformation TO Units.IN units, the following must be set:
     *    Units.BB[Units.IN]
     */
    let Units = {

        // Systems and their coordinate interpretations
        IN:0,      // (x, y, z) in inner coordinates
        UTM: 1,    // { easting, northing, zone }
        LONLAT: 2, // { lon, lat }
        EX: 3,     // { x, y } in external coordinates, z unused

        // Units per metre in different systems
        UPM: [
            1000,       // IN internal units per metre
            1,          // UTM
            undefined,  // LONLAT, not useful
            10          // EX, pixels per metre
        ],

        // Origin of the inner coordinate system in the UTM system.
        // When we start up, no zone is defined, the first conversion
        // to/from a Lat/Long will initialise it.
        inOrigin: undefined,
        
        // Bounding boxes in different systems
        BB: [
            undefined, // used
            undefined, // not used
            undefined, // not used
            undefined  // used
        ],

        /**
         * Set up parameters for EX.
         * @param bb bounds of the EX box to be transformed to IN
         * @param exUPM units-per-metre in the EX space
         * @param flipY true to invert the EX Y axis
         */
        mapFromEX(bb, exUPM, flipY) {
            Units.UPM[Units.EX] = exUPM;
            Units.BB[Units.EX] = bb;
            Units.BB[Units.IN] = {
                min: { x: 0, y: 0 },
                max: {
                    x: Units.BBwidth(Units.EX)
                    * Units.UPM[Units.IN] / Units.UPM[Units.EX],
                    y: Units.BBheight(Units.EX)
                    * Units.UPM[Units.IN] / Units.UPM[Units.EX]
                }
            };
            Units.flipEXy = flipY;
        },
        
        /**
         * Set up parameters for EX.
         * @param bb bounds of the IN box to be transformed to EX
         * @param exUPM units-per-metre in the EX space
         * @param flipY true to invert the Y axis
         */
        mapToEX(bb, exUPM, flipY) {
            Units.UPM[Units.EX] = exUPM;
            Units.BB[Units.IN] = bb;
            Units.BB[Units.EX] = {
                min: { x: 0, y: 0 },
                max: {
                    x: Units.BBwidth(Units.IN)
                    * Units.UPM[Units.EX] / Units.UPM[Units.IN],
                    y: Units.BBheight(Units.IN)
                    * Units.UPM[Units.EX] / Units.UPM[Units.IN]
                }
            };
            Units.flipEXy = flipY;
        },
        
        /**
         * Get the width of the BB in the given system
         */
        BBwidth: (system) => Units.BB[system].max.x - Units.BB[system].min.x,

        /**
         * Get the height of the BB in the given system
         */
        BBheight: (system) => Units.BB[system].max.y - Units.BB[system].min.y,
        
        /**
         * Format as typed string
         */
        stringify: (insys, data, outsys) => {
            function round(x, pos, neg) {
                let v = Math.floor(100000 * x) / 100000;
                return (v < 0) ? `${-v}°${neg}` : `${v}°${pos}`;
            }
            let o = Units.convert(insys, data, outsys);
            switch (outsys) {
            default:
            case Units.LONLAT:
                return `${round(o.lat, "N", "S")} ${round(o.lon, "E", "W")}`;
            case Units.IN:
                return `<${round(o.x)},${round(o.y)},${round(o.z)}>`;
            case Units.UTM:
                return `${o.zone} ${Math.trunc(o.east)} ${Math.trunc(o.north)}`;
            case Units.EX:
                return `(${round(o.x)}, ${round(o.y)})`;
            }
        }
    }

    function convertFromIN(data, outsys) {
        if (outsys === Units.UTM) {
            if (!Units.inOrigin)
                throw new Error("Cannot convert to UTM without an origin");

            return {
                east: data.x / Units.UPM[Units.IN]
                + Units.inOrigin.east,
                north: data.y / Units.UPM[Units.IN]
                + Units.inOrigin.north,
                zone: Units.inOrigin.zone,
                hemis: Units.inOrigin.hemis || "N"
            };
        }
            
        if (outsys === Units.LONLAT)
            return UTM.toLatLong(
                Units.convert(Units.IN, data, Units.UTM));
            
        // outsys === Units.EX
        let res = {
            x: (data.x - Units.BB[Units.IN].min.x)
            * Units.UPM[Units.EX] / Units.UPM[Units.IN],
            y: (data.y - Units.BB[Units.IN].min.y)
            * Units.UPM[Units.EX] / Units.UPM[Units.IN]
        };
        if (typeof data.x !== "undefined")
            res.z = data.z * Units.UPM[Units.EX] / Units.UPM[Units.IN]
        
        if (Units.flipEXy)
            res.y = Units.BBheight(Units.EX) - res.y;
        
        return res;
    }

    function convertFromUTM(data, outsys) {
        if (!data.zone)
            throw new Error("Cannot convert from UTM; no zone");
            
        // The first conversion from UTM sets the
        // inner origin
        if (!Units.inOrigin)
            Units.inOrigin = data;

        if (outsys === Units.IN)
            return {
                x: (data.east - Units.inOrigin.east)
                * Units.UPM[Units.IN],
                y: (data.north - Units.inOrigin.north)
                * Units.UPM[Units.IN],
                z: 0
            }
        if (outsys === Units.LONLAT)
            return UTM.toLatLong(data);
            
        return Units.convert( // outsys === Units.EX
            Units.IN,
            Units.convert(Units.UTM, data, Units.IN),
            Units.EX);
    }

    function convertFromLONLAT(data, outsys) {
        // First convert to UTM
        let u = UTM.fromLatLong(
            data.lat, data.lon,
            Units.inOrigin ? Units.inOrigin.z : undefined);
        
        // The first conversion from a lat-long sets the
        // IN origin
        if (outsys === Units.IN && !Units.inOrigin)
            Units.inOrigin = u;
        if (outsys === Units.UTM)
            return u;

        return Units.convert(Units.UTM, u, outsys);
    }
    
    Units.convert = function(insys, data, outsys) {
        if (outsys === insys)
            return data;
        if (insys < Units.IN || insys > Units.EX)
            throw new Error(`Unrecognised insys ${insys}`);
        if (outsys < Units.IN || outsys > Units.EX)
            throw new Error(`Unrecognised outsys ${outsys}`);

        if (insys === Units.IN)
            return convertFromIN(data, outsys);
        
        if (insys === Units.UTM)
            return convertFromUTM(data, outsys);
        
        if (insys === Units.LONLAT)
            return convertFromLONLAT(data, outsys);

        // insys === Units.EX
        if (outsys === Units.IN) {
            let res = {
                x: (data.x - Units.BB[Units.EX].min.x)
                * Units.UPM[Units.IN] / Units.UPM[Units.EX],
                y: (data.y - Units.BB[Units.EX].min.y)
                * Units.UPM[Units.IN] / Units.UPM[Units.EX],
                z: data.z * Units.UPM[Units.IN] / Units.UPM[Units.EX]
            };
            if (Units.flipEXy)
                res.y = -res.y;
            return res;
        }

        // else convert via IN
        let i = Units.convert(Units.EX, data, Units.IN);
        return Units.convert(Units.IN, i, outsys);
    }
    
    return Units;
});
