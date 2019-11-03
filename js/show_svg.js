const parseGpx = require('parse-gpx');
const svg = require('svgson').parse;
const Fs = require('fs-extra');

const SURVEY = "/home/crawford/Documents/Diving/Dive\ Centre\ Maps/Eccy\ Survey/";

/*
Fs.readFile(SURVEY + "Eccy.svg')
.then((data) => {
    return svg(data.toString(),
               {
                   transformNode: (node) => {
                       if (node.name === "path")
                           console.log(node.attributes.d);
                   }
               });
})
.then((obj) => {
    //console.log(JSON.stringify(obj, null, 2));    
});
*/

parseGpx(SURVEY + '20390616.gpx').then(track => {
//parseGpx(SURVEY + '20191031.gpx').then(track => {
    console.log(track);
});

Fs.readFile("../data/2019-10-31_11-06_Thu.gpx")
.then((buffer) => {
    
