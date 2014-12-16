/*
 * Not clean or tested but just to give an idea
 *
 * Usage:
 * 
 * function main() {
 *     // like today: openjscad can render and export what it could before
 *     return csg;
 *
 *     return [csg1, cag2];
 *
 *     // or as CompositeObject with custom export:
 *     // define arbitrary stuff required for object in a dict
 *     var stuff = {engrave: [path1, path2], cut: cag3, matThickness: 5};
 *     // then add a wrapper that allows to add custom exports etc. to stuff
 *     var thing = new CSG.CompositeObject(stuff);
 *     thing.addExport({'dxf': function(stuff) {
 *         // return the dxf   
 *     });
 *     // for now, openjscad renders 2d stuff as csg as well - so 2 renderings
 *     // are useful:
 *     thing.addRender({
 *         'dxf': function(stuff) {
 *             // return a 3d representation of the dxf export with line-width etc
 *         },
 *         'csg': function(stuff) {
 *             // return a csg view of the final object
 *         }
 *     });
 *     return thing;
 *
 *     // or as a helper function imported to CSG for re-use:
 *     // a custom object derived from CompositeObject:
 *     var thing = new Helpers.MyCompositeObject(stuff);
 *     // thing already has the correct exports/renders
 *     return thing;
 * }
 *
 */

CSG.CompositeObject = function(stuff) {
    this.stuff_ = stuff;
    // openjscad lists exports and renderers options based on these
    this.exports_ = {};
    this.renderers_ = {};
};


CSG.CompositeObject.prototype = {
    addExport: function(exports) {
        Object.keys(exports).forEach(function(k) {
            this.exports_[k] = exports[k];
        }, this);
    },
    addRender: function(renderers) {
        Object.keys(renderers).forEach(function(k) {
            this.renderers_[k] = renderers[k];
        }, this);
    },
    // for openjscad.js consumption
    getExport: function() {
        return this.exports_;
    },
    getRenderers_: function() {
        return this.renderers_;
    }
};



Helpers.MyCompositeObject = function(stuff) {
    CSG.CompositeObject.call(this, stuff);
    if (!(cutPaths_ in stuff)) {
        throw('please add cutPaths_');
    }
    this.addExport({
        'dxf': function() { return dxf(this.stuff_); }
    });
    this.addRender({
        'csg': function() {
            var csg = this.stuff_.cutPaths_.extrude([0, 0, matThickness])
                .subtract(this.stuff_.engravedPaths_.map(function(p) {
                   return p.rectangularExtrude(smallwidth, engraveHeight);
                }))
                .subtract(this.stuff_.engravedAreas_.map(function(cag) {
                    return cag.extrude([0, 0, this.stuff_.matThickness_]);
                }));
            return csg;
        },
        'dxf': function() {
            var csg = toRedStroke(this.stuff_.engravedPaths_)
                .concat(toblackStroke(this.stuff_.cutPaths_))
                .concat(tothinStroke(this.stuff_.engraveAreas_.map(function(cag) {
                    return cag.getOutlinePaths();
                })))
                .extrudeToCSG();
            return csg;
        }
    });
};

Helpers.MyCompositeObject.prototype = Object.create(CSG.CompositeObject.prototype);
Helpers.MyCompositeObject.prototype.constructor = Helpers.MyCompositeObject;
// anything else that's helpful
Helpers.MyCompositeObject.prototype.getMakeTime = function(speed) {
    // calculate from this.stuff_
};
