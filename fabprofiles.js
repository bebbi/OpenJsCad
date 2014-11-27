/*
 * This file describes mappings from csg.js objects to fab devices.
 * Load this script in index.html
 *
 * Change 1: propose to remove exporters from csg.js - there could be many,
 * and it would be nice to avoid export code cluttering up csg.js
 *
 * Change 2: propose to keep renderer as dumb as possible, it should render CSGs,
 * and not have intelligence about 3d representations of anything but a csg object
 *
 * Change 3: Option to keep laser strength fully out of csg.js
 *
 * Usage:
 * var engravedPaths = something; // create array of CSG.Path2D
 * var cutPaths = somethingElse; // another CSG.Path2D array
 * var engravedAreas = someCags; // array of CSG.CAG
 * var myWoodThickness = 6;
 * var myCutObj = new LaserObject(engravedPaths, cutPaths, engravedAreas, myWoodthickness);
 *
 * 1. export to dxf without cluttering csg
 * myCutObj.toDxf();
 * 2. render the real thing
 * var csg = myCutObj.asCSG();
 * and if there are different export needs (line width vs color etc), just extend LaserObject.prototype,
 * again no clutter in csg.js
 *
 * ..and if I decide, I can even 3d print myCutObj.asCSG();
 */

 var LaserObject = function(engravedPaths, cutPaths, engravedAreas, thickness) {
    this.engravedPaths_ = engravedPaths; // paths
    this.cutPaths_ = cutPaths;
    this.engravedAreas_ = engravedAreas; // CAGs

    this.matThickness_ = thickness;
 };


 LaserObject.prototype = {
    // re Change 2: this is for openjscad render.
    // can even be used if one changes mind and produces it with a 3d printer instead of laser
    asCSG: function() {
        var csg = this.cutPaths_.extrude([0, 0, matThickness])
            .subtract(this.engravedPaths_.map(function(p) {
               return p.rectangularExtrude(smallwidth, engraveHeight);
            }))
            .subtract(this.engravedAreas_.map(function(cag) {
                return cag.extrude([0, 0, this.matThickness_]);
            }));
        return csg;
    },

    // re Change 1: here is where the exporters go
    // re Change 3: deal with line color here instead of csg.js
    toDxf: function() {
        var dxf = toRedStroke(this.engravedPaths_)
            .concat(toblackStroke(this.cutPaths_))
            .concat(tothinStroke(this.engraveAreas_.map(function(cag) {
                return cag.getOutlinePaths();
            })))
            .serializeDxf();
    },

    getMakeTime: function(speed) {
        // proportional to paths length and fills area, plus maybe take laser power into account
    }
 };
