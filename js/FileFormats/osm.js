/* @copyright 2019 Crawford Currie - All rights reserved */
/* eslint-env jquery */
define("js/FileFormats/osm", ["js/FileFormats/XML", "three", "js/Units", "js/Container", "js/Contour", "js/Path"], function(XML, Three, Units, Container, Contour, Path) {

    class OSM extends XML {

        constructor() {
            super("osm");
        }

        // @Override
        load(source, data) {
            let $xml = this.parse(source, data);

            let nodes = {};
            $xml.children("node").each(function() {
                nodes[$(this).attr("id")] = Units.convert(
                    Units.LATLON,
                    {
                        lat: parseFloat($(this).attr("lat")),
                        lon: parseFloat($(this).attr("lon"))
                    },
                    Units.IN);
            });

            let ways = new Container(source);
            $xml.children("way").each(function() {
                let $way = $(this);
                let id =  $way.children("tag[k='name']").attr("v");
                if (!id)
                    id = `${$way.attr("user")}:${$way.attr("id")}`;

                let vs = [];
                $way.children("nd").each(function() {
                    vs.push($(this).attr("ref"));
                });

                let closed = false;
                if (vs[vs.length - 1] === vs[0]) {
                    closed = true;
                    vs.pop();
                }

                let way = closed ? new Contour(id) : new Path(id);
                for (let nid of vs)
                    way.addVertex(nodes[nid]);
                if (closed)
                    way.close();

                ways.addChild(way);
            });
            return Promise.resolve(ways);
        }
    }
    return OSM;
});

