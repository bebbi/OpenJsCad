/**
 * Created by sahil on 12/20/14.
 */
OpenJsCad = function() {
};

OpenJsCad.log = function(txt) {
    var timeInMs = Date.now();
    var prevtime = OpenJsCad.log.prevLogTime;
    if(!prevtime) prevtime = timeInMs;
    var deltatime = timeInMs - prevtime;
    OpenJsCad.log.prevLogTime = timeInMs;
    var timefmt = (deltatime*0.001).toFixed(3);
    txt = "["+timefmt+"] "+txt;
    if( (typeof(console) == "object") && (typeof(console.log) == "function") )
    {
        console.log(txt);
    }
    else if( (typeof(self) == "object") && (typeof(self.postMessage) == "function") )
    {
        self.postMessage({cmd: 'log', txt: txt});
    }
    else throw new Error("Cannot log");
};

// A viewer is a WebGL canvas that lets the user view a mesh. The user can
// tumble it around by dragging the mouse.
OpenJsCad.Viewer = function(containerelement, width, height, initialdepth, displayW, displayH, options) {

    //Threejs options;
    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer();

    //CAMERA
    var camera = new THREE.PerspectiveCamera();
    console.log(options.color);
    console.log(options.bgColor);
    options = options || {};
    this.colorValues = options.color || [0,0,1];
    this.bgColorValues = options.bgColor || [0.93, 0.93, 0.93, 1];

    /**
     * Here, list of color values is being converted to THREE.Color's
     * object. The last argument is passed to setClearColor method of
     * renderer. This is the only way I can think of to convert this
     * list into color objects.
     */
    this.color = new THREE.Color(this.colorValues[0], this.colorValues[1], this.colorValues[2]);
    this.bgColor = new THREE.Color(this.bgColorValues[0], this.bgColorValues[1], this.bgColorValues[2]);
    this.colorTransparency = this.bgColorValues[3];
    this.scene = scene;
    this.renderer = renderer;
    this.threeJSCamera = camera;
    this.light = light;
    this.angleX = -60;
    this.angleY = 0;
    this.angleZ = -45;
    this.viewpointX = 50;
    this.viewpointY = -50;
    this.viewpointZ = 50;

    camera.position.set(this.viewpointX, this.viewpointY, this.viewpointZ);
    camera.rotation.y = 180 * Math.PI / 180;
    camera.lookAt(scene.position);

    // LIGHTS
    var light = new THREE.PointLight();
    //offset to the camera
    light.position.set(0, 0 , 0); //setting to 0 offset
    camera.add(light);
    scene.add(camera);

    // Draw axes flag:
    this.drawAxes = true;
    // Draw triangle lines:
    this.drawLines = options.showLines || false;
    // Set to true so lines don't use the depth buffer
    this.lineOverlay = options.showLines || false;

    renderer.domElement.style.width = displayW;
    renderer.domElement.style.height = displayH;
    renderer.domElement.width = width;
    renderer.domElement.height = height;
    renderer.setViewport(0, 0, width, height);
    renderer.setClearColor(this.bgColor, this.colorTransparency);
    containerelement.appendChild(renderer.domElement);
    var controls = new THREE.TrackballControls(camera, renderer.domElement);
    this.controls = controls;
    var render = function () {
        try {
            requestAnimationFrame(render);
            controls.update();
            renderer.render(scene, camera);
        } catch(error){
            console.log(error);
        }
    };

    var debugaxis = function(axisLength){
        //Shorten the vertex function
        function v(x,y,z){
            return new THREE.Vector3(x,y,z);
        }

        //Create axis (point1, point2, colour)
        function createAxis(p1, p2, color){
            var positiveLine, negativeLine,
                positiveLineGeometry = new THREE.Geometry(),
                negativeLineGeometry = new THREE.Geometry(),
                positiveLineMat = new THREE.LineBasicMaterial({color: color, lineWidth: 1}),
                negativeLineMat = new THREE.LineBasicMaterial({color: 0xD3D3D3, lineWidth: 1});
            var origin = v(0 , 0 , 0);

            positiveLineGeometry.vertices.push(origin , p2);
            negativeLineGeometry.vertices.push(p1, origin);
            positiveLine = new THREE.Line(positiveLineGeometry, positiveLineMat);
            negativeLine = new THREE.Line(negativeLineGeometry, negativeLineMat);

            scene.add(positiveLine);
            scene.add(negativeLine);
        }

        createAxis(v(-axisLength, 0, 0), v(axisLength, 0, 0), 0xFF0000); //x axis
        createAxis(v(0, -axisLength, 0), v(0, axisLength, 0), 0x00FF00); //y axis
        createAxis(v(0, 0, -axisLength), v(0, 0, axisLength), 0x0000FF); //z axis
    };
    this.createAxes = debugaxis;
    this.render = render;
    this.render();
    var _this=this;
    this.clear();
};

OpenJsCad.Viewer.prototype = {
    setCsg: function(csg) {
        this.meshes = THREE.CSG.fromCSG(csg);
        this.onDraw();
    },

    clear: function() {
        // empty mesh list:
        this.meshes = [];
        this.onDraw();
    },

    supported: function() {
        return !!this.gl;
    },

    onDraw: function(e) {
        //remove previous object from the scene first
        this.scene.remove(this.pic);
        var material;
        material = new THREE.MeshPhongMaterial({color: this.color});
        if(this.lineOverlay) {
            material = new THREE.MeshPhongMaterial( { color: this.color, transparent: true, opacity: 0.4 })
        }
        if(this.drawLines) {
            var wireframeMaterial =  new THREE.MeshBasicMaterial( { color: 0x000088, wireframe: true, side:THREE.DoubleSide } );
            var wireframeObject = new THREE.Mesh(this.meshes, wireframeMaterial);
            this.scene.add(wireframeObject);
        }
        material.shading = THREE.SmoothShading;
        material.shininess = 100;

        var object = new THREE.Mesh(this.meshes, material);
        //used here for the reference in the next call
        this.pic = object;
        this.controls.update();
        console.log(this.meshes);
        this.scene.add(object);

        if(this.drawAxes){
            this.createAxes(100);
        }

        this.render();
    },

    buildAxes: function(length){
        var axes = new THREE.Object3D();
        this.scene.add(axes);
    }
};

// make a full url path out of a base path and url component.
// url argument is interpreted as a folder name if it ends with a slash
OpenJsCad.makeAbsoluteUrl = function(url, baseurl) {
    if(!url.match(/^[a-z]+\:/i))
    {
        var re = /^\/|\/$/g;
        if (baseurl[baseurl.length - 1] != '/') {
            // trailing part is a file, not part of base - remove
            baseurl = baseurl.replace(/[^\/]*$/, "");
        }
        if (url[0] == '/') {
            var basecomps = baseurl.split('/');
            url = basecomps[0] + '//' + basecomps[2] + '/' + url.replace(re, "");
        }
        else {
            url = (baseurl.replace(re, "") + '/' + url.replace(re, ""))
                .replace(/[^\/]+\/\.\.\//g, "");
        }
    }
    return url;
};

OpenJsCad.isChrome = function()
{
    return (navigator.userAgent.search("Chrome") >= 0);
};

// This is called from within the web worker. Execute the main() function of the supplied script
// and post a message to the calling thread when finished
OpenJsCad.runMainInWorker = function(mainParameters)
{
    try
    {
        if(typeof(main) != 'function') throw new Error('Your jscad file should contain a function main() which returns a CSG solid or a CAG area.');
        OpenJsCad.log.prevLogTime = Date.now();
        var result = main(mainParameters);
        result=OpenJsCad.expandResultObjectArray(result);
        OpenJsCad.checkResult(result);
        var result_compact = OpenJsCad.resultToCompactBinary(result);
        result = null; // not needed anymore
        self.postMessage({cmd: 'rendered', result: result_compact});
    }
    catch(e)
    {
        var errtxt = e.toString();
        if(e.stack)
        {
            errtxt += '\nStack trace:\n'+e.stack;
        }
        self.postMessage({cmd: 'error', err: errtxt});
    }
};

// expand an array of CSG or CAG objects into an array of objects [{data: <CAG or CSG object>}]
OpenJsCad.expandResultObjectArray = function(result) {
    if(result instanceof Array)
    {
        result=result.map(function(resultelement){
            if( (resultelement instanceof CSG) || (resultelement instanceof CAG) )
            {
                resultelement = {data: resultelement};
            }
            return resultelement;
        });
    }
    return result;
};

// check whether the supplied script returns valid object(s)
OpenJsCad.checkResult = function(result) {
    var ok=true;
    if(typeof(result) != "object")
    {
        ok=false;
    }
    else
    {
        if(result instanceof Array)
        {
            if(result.length < 1)
            {
                ok=false;
            }
            else
            {
                result.forEach(function(resultelement){
                    if(! ("data" in resultelement))
                    {
                        ok=false;
                    }
                    else
                    {
                        if( (resultelement.data instanceof CSG) || (resultelement.data instanceof CAG) )
                        {
                            // ok
                        }
                        else
                        {
                            ok=false;
                        }
                    }
                });
            }

        }
        else if( (result instanceof CSG) || (result instanceof CAG) )
        {
        }
        else
        {
            ok=false;
        }
    }
    if(!ok)
    {
        throw new Error("Your main() function does not return valid data. It should return one of the following: a CSG object, a CAG object, an array of CSG/CAG objects, or an array of objects: [{name:, caption:, data:}, ...] where data contains a CSG or CAG object.");
    }
};

// convert the result to a compact binary representation, to be copied from the webworker to the main thread.
// it is assumed that checkResult() has been called already so the data is valid.
OpenJsCad.resultToCompactBinary = function(resultin) {
    var resultout;
    if(resultin instanceof Array)
    {
        resultout=resultin.map(function(resultelement){
            var r=resultelement;
            r.data=resultelement.data.toCompactBinary();
            return r;
        });
    }
    else
    {
        resultout=resultin.toCompactBinary();
    }
    return resultout;
};

OpenJsCad.resultFromCompactBinary = function(resultin) {
    function fromCompactBinary(r)
    {
        var result;
        if(r.class == "CSG")
        {
            result=CSG.fromCompactBinary(r);
        }
        else if(r.class == "CAG")
        {
            result=CAG.fromCompactBinary(r);
        }
        else
        {
            throw new Error("Cannot parse result");
        }
        return result;
    }
    var resultout;
    if(resultin instanceof Array)
    {
        resultout=resultin.map(function(resultelement){
            var r=resultelement;
            r.data=fromCompactBinary(resultelement.data);
            return r;
        });
    }
    else
    {
        resultout=fromCompactBinary(resultin);
    }
    return resultout;
};


OpenJsCad.parseJsCadScriptSync = function(script, mainParameters, debugging) {
    var workerscript = "";
    workerscript += script;
    if(debugging)
    {
        workerscript += "\n\n\n\n\n\n\n/* -------------------------------------------------------------------------\n";
        workerscript += "OpenJsCad debugging\n\nAssuming you are running Chrome:\nF10 steps over an instruction\nF11 steps into an instruction\n";
        workerscript += "F8  continues running\nPress the (||) button at the bottom to enable pausing whenever an error occurs\n";
        workerscript += "Click on a line number to set or clear a breakpoint\n";
        workerscript += "For more information see: http://code.google.com/chrome/devtools/docs/overview.html\n\n";
        workerscript += "------------------------------------------------------------------------- */\n";
        workerscript += "\n\n// Now press F11 twice to enter your main() function:\n\n";
        workerscript += "debugger;\n";
    }
    workerscript += "return main("+JSON.stringify(mainParameters)+");";
    var f = new Function(workerscript);
    OpenJsCad.log.prevLogTime = Date.now();
    var result = f();
    result=OpenJsCad.expandResultObjectArray(result);
    OpenJsCad.checkResult(result);
    return result;
};

// callback: should be function(error, csg)
OpenJsCad.parseJsCadScriptASync = function(script, mainParameters, options, callback) {
    var baselibraries = [
        "csg.js",
        "openjscad.js"
    ];

    var baseurl = document.location.href.replace(/\?.*$/, '');
    var openjscadurl = baseurl;
    if (typeof options['openJsCadPath'] != 'undefined') {
        // trailing '/' indicates it is a folder. This is necessary because makeAbsoluteUrl is called
        // on openjscadurl
        openjscadurl = OpenJsCad.makeAbsoluteUrl( options['openJsCadPath'], baseurl ) + '/';
    }

    var libraries = [];
    if (typeof options['libraries'] != 'undefined') {
        libraries = options['libraries'];
    }

    var workerscript = "";
    workerscript += script;
    workerscript += "\n\n\n\n//// The following code is added by OpenJsCad:\n";
    workerscript += "var _csg_baselibraries=" + JSON.stringify(baselibraries)+";\n";
    workerscript += "var _csg_libraries=" + JSON.stringify(libraries)+";\n";
    workerscript += "var _csg_baseurl=" + JSON.stringify(baseurl)+";\n";
    workerscript += "var _csg_openjscadurl=" + JSON.stringify(openjscadurl)+";\n";
    workerscript += "var _csg_makeAbsoluteURL=" + OpenJsCad.makeAbsoluteUrl.toString()+";\n";
    workerscript += "_csg_baselibraries = _csg_baselibraries.map(function(l){return _csg_makeAbsoluteURL(l,_csg_openjscadurl);});\n";
    workerscript += "_csg_libraries = _csg_libraries.map(function(l){return _csg_makeAbsoluteURL(l,_csg_baseurl);});\n";
    workerscript += "_csg_baselibraries.map(function(l){importScripts(l)});\n";
    workerscript += "_csg_libraries.map(function(l){importScripts(l)});\n";
    workerscript += "self.addEventListener('message', function(e) {if(e.data && e.data.cmd == 'render'){";
    workerscript += "  OpenJsCad.runMainInWorker("+JSON.stringify(mainParameters)+");";
    workerscript += "}},false);\n";

    var blobURL = OpenJsCad.textToBlobUrl(workerscript);

    if(!window.Worker) throw new Error("Your browser doesn't support Web Workers. Please try the Chrome browser instead.");
    var worker = new Worker(blobURL);
    worker.onmessage = function(e) {
        if(e.data)
        {
            if(e.data.cmd == 'rendered')
            {
                var resulttype = e.data.result.class;
                var result = OpenJsCad.resultFromCompactBinary(e.data.result);
                callback(null, result);
            }
            else if(e.data.cmd == "error")
            {
                callback(e.data.err, null);
            }
            else if(e.data.cmd == "log")
            {
                console.log(e.data.txt);
            }
        }
    };
    worker.onerror = function(e) {
        var errtxt = "Error in line "+e.lineno+": "+e.message;
        callback(errtxt, null);
    };
    worker.postMessage({
        cmd: "render"
    }); // Start the worker.
    return worker;
};

OpenJsCad.getWindowURL = function() {
    if(window.URL) return window.URL;
    else if(window.webkitURL) return window.webkitURL;
    else throw new Error("Your browser doesn't support window.URL");
};

OpenJsCad.textToBlobUrl = function(txt) {
    var windowURL=OpenJsCad.getWindowURL();
    var blob = new Blob([txt]);
    var blobURL = windowURL.createObjectURL(blob);
    if(!blobURL) throw new Error("createObjectURL() failed");
    return blobURL;
};

OpenJsCad.revokeBlobUrl = function(url) {
    if(window.URL) window.URL.revokeObjectURL(url);
    else if(window.webkitURL) window.webkitURL.revokeObjectURL(url);
    else throw new Error("Your browser doesn't support window.URL");
};

OpenJsCad.FileSystemApiErrorHandler = function(fileError, operation) {
    var errormap = {
        1: 'NOT_FOUND_ERR',
        2: 'SECURITY_ERR',
        3: 'ABORT_ERR',
        4: 'NOT_READABLE_ERR',
        5: 'ENCODING_ERR',
        6: 'NO_MODIFICATION_ALLOWED_ERR',
        7: 'INVALID_STATE_ERR',
        8: 'SYNTAX_ERR',
        9: 'INVALID_MODIFICATION_ERR',
        10: 'QUOTA_EXCEEDED_ERR',
        11: 'TYPE_MISMATCH_ERR',
        12: 'PATH_EXISTS_ERR',
    };
    var errname;
    if(fileError.code in errormap)
    {
        errname = errormap[fileError.code];
    }
    else
    {
        errname = "Error #"+fileError.code;
    }
    var errtxt = "FileSystem API error: "+operation+" returned error "+errname;
    throw new Error(errtxt);
};

OpenJsCad.AlertUserOfUncaughtExceptions = function() {
    window.onerror = function(message, url, line) {
        message = message.replace(/^Uncaught /i, "");
        alert(message+"\n\n("+url+" line "+line+")");
    };
};

// parse the jscad script to get the parameter definitions
OpenJsCad.getParamDefinitions = function(script) {
    var scriptisvalid = true;
    try
    {
        // first try to execute the script itself
        // this will catch any syntax errors
        var f = new Function(script);
        f();
    }
    catch(e) {
        scriptisvalid = false;
    }
    var params = [];
    if(scriptisvalid)
    {
        var script1 = "if(typeof(getParameterDefinitions) == 'function') {return getParameterDefinitions();} else {return [];} ";
        script1 += script;
        var f = new Function(script1);
        params = f();
        if( (typeof(params) != "object") || (typeof(params.length) != "number") )
        {
            throw new Error("The getParameterDefinitions() function should return an array with the parameter definitions");
        }
    }
    return params;
};

/**
 * options parameter:
 * - showLines: display all triangle lines without respecting depth buffer
 * - bgColor: canvas background color
 * - color: object color
 * - viewerwidth, viewerheight: set rendering size. If in pixels, both canvas resolution and
 * display size are affected. If not (e.g. in %), canvas resolution is unaffected, but gets zoomed
 * to display size
 */
OpenJsCad.Processor = function(containerdiv, options, onchange) {
    this.containerdiv = containerdiv;
    this.onchange = onchange;
    this.viewerdiv = null;
    this.viewer = null;
    this.zoomControl = null;
    this.options = options || {};
    this.viewerwidth = this.options.viewerwidth || "800px";
    this.viewerheight = this.options.viewerheight || "600px";
    this.initialViewerDistance = 200;
    this.processing = false;
    this.currentObject = null;
    this.hasValidCurrentObject = false;
    this.hasOutputFile = false;
    this.worker = null;
    this.paramDefinitions = [];
    this.paramControls = [];
    this.script = null;
    this.hasError = false;
    this.debugging = false;
    this.createElements();
};

OpenJsCad.Processor.convertToSolid = function(obj) {
    if( (typeof(obj) == "object") && ((obj instanceof CAG)) )
    {
        // convert a 2D shape to a thin solid:
        obj=obj.extrude({offset: [0,0,0.1]});
    }
    else if( (typeof(obj) == "object") && ((obj instanceof CSG)) )
    {
        // obj already is a solid
    }
    else
    {
        throw new Error("Cannot convert to solid");
    }
    return obj;
};

OpenJsCad.Processor.prototype = {
    setLineDisplay: function(bool) {
        // Draw triangle lines:
        this.viewer.drawLines = bool;
        // Set to true so lines don't use the depth buffer
        this.viewer.lineOverlay = bool;
    },

    createElements: function() {
        var that = this;//for event handlers

        while(this.containerdiv.children.length > 0)
        {
            this.containerdiv.removeChild(this.containerdiv.children[0]);
        }

        var viewerdiv = document.createElement("div");
        viewerdiv.className = "viewer";
        viewerdiv.style.width = this.viewerwidth;
        viewerdiv.style.height = this.viewerheight;
        // viewerdiv.style.backgroundColor = "rgb(200,200,200)";
        this.containerdiv.appendChild(viewerdiv);
        this.viewerdiv = viewerdiv;
        // if viewerdiv sizes in px -> size canvas accordingly. Else use 800x600, canvas will then scale
        var wArr = this.viewerwidth.match(/^(\d+(?:\.\d+)?)(.*)$/);
        var hArr = this.viewerheight.match(/^(\d+(?:\.\d+)?)(.*)$/);
        var canvasW = wArr[2] == 'px' ? wArr[1] : '800';
        var canvasH = hArr[2] == 'px' ? hArr[1] : '600';
        try
        {
            this.viewer = new OpenJsCad.Viewer(this.viewerdiv, canvasW, canvasH,
                this.initialViewerDistance, this.viewerwidth, this.viewerheight, this.options);
        } catch(e) {
            //      this.viewer = null;
            this.viewerdiv.innerHTML = "<b><br><br>Error: " + e.toString() + "</b><br><br>OpenJsCad requires a WebGL enabled browser. Try a recent version of Chrome of Firefox.";
            //      this.viewerdiv.innerHTML = e.toString();
        }
        //Zoom control
        var div = document.createElement("div");
        this.zoomControl = div.cloneNode(false);
        this.zoomControl.style.width = this.viewerwidth;
        this.zoomControl.style.height = '20px';
        this.zoomControl.style.backgroundColor = 'transparent';
        this.zoomControl.style.overflowX = 'scroll';
        // div.style.width = this.viewerwidth * 11 + 'px';
        // FIXME - below doesn't behave as expected if
        // options.viewerwidth not in pixels
        div.style.width = this.viewerdiv.canvasW * 11 + 'px';
        div.style.height = '1px';
        this.zoomControl.appendChild(div);
        this.zoomChangedBySlider=false;
        this.zoomControl.onscroll = function(event) {
            var zoom = that.zoomControl;
            var newzoom=zoom.scrollLeft / (10 * zoom.offsetWidth);
            that.zoomChangedBySlider=true; // prevent recursion via onZoomChanged
            that.viewer.setZoom(newzoom);
            that.zoomChangedBySlider=false;
        };
        if(this.viewer)
        {
            this.viewer.onZoomChanged = function() {
                if(!that.zoomChangedBySlider)
                {
                    var newzoom = that.viewer.getZoom();
                    that.zoomControl.scrollLeft = newzoom * (10 * that.zoomControl.offsetWidth);
                }
            };
            this.zoomControl.scrollLeft = this.viewer.viewpointZ / this.viewer.ZOOM_MAX *
            (this.zoomControl.scrollWidth - this.zoomControl.offsetWidth);
        }

        this.containerdiv.appendChild(this.zoomControl);
        //this.zoomControl.scrollLeft = this.viewer.viewpointZ / this.viewer.ZOOM_MAX * this.zoomControl.offsetWidth;

        //end of zoom control

        this.errordiv = document.createElement("div");
        this.errorpre = document.createElement("pre");
        this.errordiv.appendChild(this.errorpre);
        this.statusdiv = document.createElement("div");
        this.statusdiv.className = "statusdiv";
        //this.statusdiv.style.width = this.viewerwidth + "px";
        this.statusspan = document.createElement("span");
        this.statusbuttons = document.createElement("div");
        this.statusbuttons.style.float = "right";
        this.statusdiv.appendChild(this.statusspan);
        this.statusdiv.appendChild(this.statusbuttons);
        this.abortbutton = document.createElement("button");
        this.abortbutton.innerHTML = "Abort";
        this.abortbutton.onclick = function(e) {
            that.abort();
        };
        this.statusbuttons.appendChild(this.abortbutton);

        this.renderedElementDropdown = document.createElement("select");
        this.renderedElementDropdown.onchange = function(e) {
            that.setSelectedObjectIndex(that.renderedElementDropdown.selectedIndex);
        };
        this.renderedElementDropdown.style.display = "none";
        this.statusbuttons.appendChild(this.renderedElementDropdown);

        this.formatDropdown = document.createElement("select");
        this.formatDropdown.onchange = function(e) {
            that.currentFormat = that.formatDropdown.options[that.formatDropdown.selectedIndex].value;
            that.updateDownloadLink();
        };
        this.statusbuttons.appendChild(this.formatDropdown);
        this.generateOutputFileButton = document.createElement("button");
        this.generateOutputFileButton.onclick = function(e) {
            that.generateOutputFile();
        };
        this.statusbuttons.appendChild(this.generateOutputFileButton);
        this.downloadOutputFileLink = document.createElement("a");
        this.statusbuttons.appendChild(this.downloadOutputFileLink);
        this.parametersdiv = document.createElement("div");
        this.parametersdiv.className = "parametersdiv";
        var headerdiv = document.createElement("div");
        headerdiv.textContent = "Parameters:";
        headerdiv.className = "header";
        this.parametersdiv.appendChild(headerdiv);
        this.parameterstable = document.createElement("table");
        this.parameterstable.className = "parameterstable";
        this.parametersdiv.appendChild(this.parameterstable);
        var parseParametersButton = document.createElement("button");
        parseParametersButton.innerHTML = "Update";
        parseParametersButton.onclick = function(e) {
            that.rebuildSolid();
        };
        this.parametersdiv.appendChild(parseParametersButton);
        this.enableItems();
        this.containerdiv.appendChild(this.statusdiv);
        this.containerdiv.appendChild(this.errordiv);
        this.containerdiv.appendChild(this.parametersdiv);
        this.clearViewer();
    },

    getFilenameForRenderedObject: function() {
        var filename = this.filename;
        if(!filename) filename = "openjscad";
        var index = this.renderedElementDropdown.selectedIndex;
        if(index >= 0)
        {
            var renderedelement = this.currentObjects[index];
            if('name' in renderedelement)
            {
                filename = renderedelement.name;
            }
            else
            {
                filename += "_"+(index + 1);
            }
        }
        return filename;
    },

    setRenderedObjects: function(obj) {
        // if obj is a single CSG or CAG, convert to the array format:
        if(obj === null)
        {
            obj=[];
        }
        else
        {
            if( !(obj instanceof Array))
            {
                obj=[
                    {
                        data: obj,
                    },
                ];
            }
        }
        this.currentObjects=obj;
        while(this.renderedElementDropdown.options.length > 0) this.renderedElementDropdown.options.remove(0);

        for(var i=0; i < obj.length; ++i)
        {
            var renderedelement = obj[i];
            var caption;
            if('caption' in renderedelement)
            {
                caption = renderedelement.caption;
            }
            else if('name' in renderedelement)
            {
                caption = renderedelement.name;
            }
            else
            {
                caption = "Element #"+(i+1);
            }
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(caption));
            this.renderedElementDropdown.options.add(option);
        }
        this.renderedElementDropdown.style.display = (obj.length >= 2)? "inline":"none";
        this.setSelectedObjectIndex( (obj.length > 0)? 0:-1);

    },

    setSelectedObjectIndex: function(index) {
        this.clearOutputFile();
        this.renderedElementDropdown.selectedIndex = index;
        var obj;
        if(index < 0)
        {
            obj=new CSG();
        }
        else
        {
            obj=this.currentObjects[index].data;
        }
        this.currentObjectIndex = index;
        this.currentObject = obj;
        if(this.viewer)
        {
            var csg = OpenJsCad.Processor.convertToSolid(obj);
            this.viewer.setCsg(csg);
        }
        this.hasValidCurrentObject = true;

        while(this.formatDropdown.options.length > 0)
            this.formatDropdown.options.remove(0);

        var that = this;
        this.supportedFormatsForCurrentObject().forEach(function(format) {
            var option = document.createElement("option");
            option.setAttribute("value", format);
            option.appendChild(document.createTextNode(that.formatInfo(format).displayName));
            that.formatDropdown.options.add(option);
        });

        this.updateDownloadLink();
    },

    selectedFormat: function() {
        return this.formatDropdown.options[this.formatDropdown.selectedIndex].value;
    },

    selectedFormatInfo: function() {
        return this.formatInfo(this.selectedFormat());
    },

    updateDownloadLink: function() {
        var ext = this.selectedFormatInfo().extension;
        this.generateOutputFileButton.innerHTML = "Generate "+ext.toUpperCase();
    },

    clearViewer: function() {
        this.clearOutputFile();
        this.setRenderedObjects(null);
        this.hasValidCurrentObject = false;
        this.enableItems();
    },

    abort: function() {
        if(this.processing)
        {
            //todo: abort
            this.processing=false;
            this.statusspan.innerHTML = "Aborted.";
            this.worker.terminate();
            this.enableItems();
            if(this.onchange) this.onchange();
        }
    },

    enableItems: function() {
        this.abortbutton.style.display = this.processing? "inline":"none";
        this.formatDropdown.style.display = ((!this.hasOutputFile)&&(this.hasValidCurrentObject))? "inline":"none";
        this.generateOutputFileButton.style.display = ((!this.hasOutputFile)&&(this.hasValidCurrentObject))? "inline":"none";
        this.downloadOutputFileLink.style.display = this.hasOutputFile? "inline":"none";
        this.parametersdiv.style.display = (this.paramControls.length > 0)? "block":"none";
        this.errordiv.style.display = this.hasError? "block":"none";
        this.statusdiv.style.display = this.hasError? "none":"block";
    },

    setOpenJsCadPath: function(path) {
        this.options[ 'openJsCadPath' ] = path;
    },

    addLibrary: function(lib) {
        if( typeof this.options[ 'libraries' ] == 'undefined' ) {
            this.options[ 'libraries' ] = [];
        }
        this.options[ 'libraries' ].push( lib );
    },

    setError: function(txt) {
        this.hasError = (txt != "");
        this.errorpre.textContent = txt;
        this.enableItems();
    },

    setDebugging: function(debugging) {
        this.debugging = debugging;
    },

    // script: javascript code
    // filename: optional, the name of the .jscad file
    setJsCad: function(script, filename) {
        if(!filename) filename = "openjscad.jscad";
        filename = filename.replace(/\.jscad$/i, "");
        this.abort();
        this.clearViewer();
        this.paramDefinitions = [];
        this.paramControls = [];
        this.script = null;
        this.setError("");
        var scripthaserrors = false;
        try
        {
            this.paramDefinitions = OpenJsCad.getParamDefinitions(script);
            this.createParamControls();
        }
        catch(e)
        {
            this.setError(e.toString());
            this.statusspan.innerHTML = "Error.";
            scripthaserrors = true;
        }
        if(!scripthaserrors)
        {
            this.script = script;
            this.filename = filename;
            this.rebuildSolid();
        }
        else
        {
            this.enableItems();
            if(this.onchange) this.onchange();
        }
    },

    getParamValues: function()
    {
        var paramValues = {};
        for(var i = 0; i < this.paramDefinitions.length; i++)
        {
            var paramdef = this.paramDefinitions[i];
            var type = "text";
            if('type' in paramdef)
            {
                type = paramdef.type;
            }
            var control = this.paramControls[i];
            var value;
            if( (type == "text") || (type == "longtext") || (type == "float") || (type == "int") )
            {
                value = control.value;
                if( (type == "float") || (type == "int") )
                {
                    var isnumber = !isNaN(parseFloat(value)) && isFinite(value);
                    if(!isnumber)
                    {
                        throw new Error("Not a number: "+value);
                    }
                    if(type == "int")
                    {
                        value = parseInt(value, 10);
                    }
                    else
                    {
                        value = parseFloat(value);
                    }
                }
            }
            else if(type == "choice")
            {
                value = control.options[control.selectedIndex].value;
            }
            else if(type == "bool")
            {
                value = control.checked;
            }
            paramValues[paramdef.name] = value;
        }
        return paramValues;
    },

    rebuildSolid: function()
    {
        this.abort();
        this.setError("");
        this.clearViewer();
        this.processing = true;
        this.statusspan.innerHTML = "Processing, please wait...";
        this.enableItems();
        var that = this;
        var paramValues = this.getParamValues();
        var useSync = this.debugging;
        var options = {};

        if(!useSync)
        {
            this.worker = OpenJsCad.parseJsCadScriptASync(this.script, paramValues, this.options, function(err, obj) {
                that.processing = false;
                that.worker = null;
                if(err)
                {
                    that.setError(err);
                    that.statusspan.innerHTML = "Error.";
                }
                else
                {
                    that.setRenderedObjects(obj);
                    that.statusspan.innerHTML = "Ready.";
                }
                that.enableItems();
                if(that.onchange) that.onchange();
            });
        }
        else
        {
            try
            {
                var obj = OpenJsCad.parseJsCadScriptSync(this.script, paramValues, this.debugging);
                that.setRenderedObjects(obj);
                that.processing = false;
                that.statusspan.innerHTML = "Ready.";
            }
            catch(e)
            {
                that.processing = false;
                var errtxt = e.toString();
                if(e.stack)
                {
                    errtxt += '\nStack trace:\n'+e.stack;
                }
                that.setError(errtxt);
                that.statusspan.innerHTML = "Error.";
            }
            that.enableItems();
            if(that.onchange) that.onchange();
        }
    },

    hasSolid: function() {
        return this.hasValidCurrentObject;
    },

    isProcessing: function() {
        return this.processing;
    },

    clearOutputFile: function() {
        if(this.hasOutputFile)
        {
            this.hasOutputFile = false;
            if(this.outputFileDirEntry)
            {
                this.outputFileDirEntry.removeRecursively(function(){});
                this.outputFileDirEntry=null;
            }
            if(this.outputFileBlobUrl)
            {
                OpenJsCad.revokeBlobUrl(this.outputFileBlobUrl);
                this.outputFileBlobUrl = null;
            }
            this.enableItems();
            if(this.onchange) this.onchange();
        }
    },

    generateOutputFile: function() {
        this.clearOutputFile();
        if(this.hasValidCurrentObject)
        {
            try
            {
                this.generateOutputFileFileSystem();
            }
            catch(e)
            {
                this.generateOutputFileBlobUrl();
            }
        }
    },

    currentObjectToBlob: function() {
        var format = this.selectedFormat();

        var blob;
        if(format == "stl")
        {
            blob=this.currentObject.fixTJunctions().toStlBinary();
        }
        else if(format == "x3d") {
            blob=this.currentObject.fixTJunctions().toX3D(bb);
        }
        else if(format == "dxf")
        {
            blob=this.currentObject.toDxf();
        }
        else
        {
            throw new Error("Not supported");
        }
        return blob;
    },

    supportedFormatsForCurrentObject: function() {
        if (this.currentObject instanceof CSG) {
            return ["stl", "x3d"];
        } else if (this.currentObject instanceof CAG) {
            return ["dxf"];
        } else {
            throw new Error("Not supported");
        }
    },

    formatInfo: function(format) {
        return {
            stl: {
                displayName: "STL",
                extension: "stl",
                mimetype: "application/sla",
            },
            x3d: {
                displayName: "X3D",
                extension: "x3d",
                mimetype: "model/x3d+xml",
            },
            dxf: {
                displayName: "DXF",
                extension: "dxf",
                mimetype: "application/dxf",
            }
        }[format];
    },

    downloadLinkTextForCurrentObject: function() {
        var ext = this.selectedFormatInfo().extension;
        return "Download "+ext.toUpperCase();
    },

    generateOutputFileBlobUrl: function() {
        var blob = this.currentObjectToBlob();
        var windowURL=OpenJsCad.getWindowURL();
        this.outputFileBlobUrl = windowURL.createObjectURL(blob)
        if(!this.outputFileBlobUrl) throw new Error("createObjectURL() failed");
        this.hasOutputFile = true;
        this.downloadOutputFileLink.href = this.outputFileBlobUrl;
        this.downloadOutputFileLink.innerHTML = this.downloadLinkTextForCurrentObject();
        var ext = this.selectedFormatInfo().extension;
        this.downloadOutputFileLink.setAttribute("download", "openjscad."+ext);
        this.enableItems();
        if(this.onchange) this.onchange();
    },

    generateOutputFileFileSystem: function() {
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        if(!window.requestFileSystem)
        {
            throw new Error("Your browser does not support the HTML5 FileSystem API. Please try the Chrome browser instead.");
        }
        // create a random directory name:
        var dirname = "OpenJsCadOutput1_"+parseInt(Math.random()*1000000000, 10)+"."+extension;
        var extension = this.selectedFormatInfo().extension;
        var filename = this.getFilenameForRenderedObject()+"."+extension;
        var that = this;
        window.requestFileSystem(TEMPORARY, 20*1024*1024, function(fs){
                fs.root.getDirectory(dirname, {create: true, exclusive: true}, function(dirEntry) {
                        that.outputFileDirEntry = dirEntry;
                        dirEntry.getFile(filename, {create: true, exclusive: true}, function(fileEntry) {
                                fileEntry.createWriter(function(fileWriter) {
                                        fileWriter.onwriteend = function(e) {
                                            that.hasOutputFile = true;
                                            that.downloadOutputFileLink.href = fileEntry.toURL();
                                            that.downloadOutputFileLink.type = that.selectedFormatInfo().mimetype;
                                            that.downloadOutputFileLink.innerHTML = that.downloadLinkTextForCurrentObject();
                                            that.downloadOutputFileLink.setAttribute("download", fileEntry.name);
                                            that.enableItems();
                                            if(that.onchange) that.onchange();
                                        };
                                        fileWriter.onerror = function(e) {
                                            throw new Error('Write failed: ' + e.toString());
                                        };
                                        var blob = that.currentObjectToBlob();
                                        fileWriter.write(blob);
                                    },
                                    function(fileerror){OpenJsCad.FileSystemApiErrorHandler(fileerror, "createWriter");}
                                );
                            },
                            function(fileerror){OpenJsCad.FileSystemApiErrorHandler(fileerror, "getFile('"+filename+"')");}
                        );
                    },
                    function(fileerror){OpenJsCad.FileSystemApiErrorHandler(fileerror, "getDirectory('"+dirname+"')");}
                );
            },
            function(fileerror){OpenJsCad.FileSystemApiErrorHandler(fileerror, "requestFileSystem");}
        );
    },

    createParamControls: function() {
        this.parameterstable.innerHTML = "";
        this.paramControls = [];
        var paramControls = [];
        var tablerows = [];
        for(var i = 0; i < this.paramDefinitions.length; i++)
        {
            var errorprefix = "Error in parameter definition #"+(i+1)+": ";
            var paramdef = this.paramDefinitions[i];
            if(!('name' in paramdef))
            {
                throw new Error(errorprefix + "Should include a 'name' parameter");
            }
            var type = "text";
            if('type' in paramdef)
            {
                type = paramdef.type;
            }
            if( (type !== "text") && (type !== "int") && (type !== "float") && (type !== "choice") && (type !== "longtext") && (type !== "bool") )
            {
                throw new Error(errorprefix + "Unknown parameter type '"+type+"'");
            }
            var initial;
            if('initial' in paramdef)
            {
                initial = paramdef.initial;
            }
            else if('default' in paramdef)
            {
                initial = paramdef['default'];
            }
            var control;
            if( (type == "text") || (type == "int") || (type == "float") )
            {
                control = document.createElement("input");
                control.type = "text";
                if(initial !== undefined)
                {
                    control.value = initial;
                }
                else
                {
                    if( (type == "int") || (type == "float") )
                    {
                        control.value = "0";
                    }
                    else
                    {
                        control.value = "";
                    }
                }
            }
            else if(type == "choice")
            {
                if(!('values' in paramdef))
                {
                    throw new Error(errorprefix + "Should include a 'values' parameter");
                }
                control = document.createElement("select");
                var values = paramdef.values;
                var captions;
                if('captions' in paramdef)
                {
                    captions = paramdef.captions;
                    if(captions.length != values.length)
                    {
                        throw new Error(errorprefix + "'captions' and 'values' should have the same number of items");
                    }
                }
                else
                {
                    captions = values;
                }
                var selectedindex = 0;
                for(var valueindex = 0; valueindex < values.length; valueindex++)
                {
                    var option = document.createElement("option");
                    option.value = values[valueindex];
                    option.text = captions[valueindex];
                    control.add(option);
                    if(initial !== undefined)
                    {
                        if(initial == values[valueindex])
                        {
                            selectedindex = valueindex;
                        }
                    }
                }
                if(values.length > 0)
                {
                    control.selectedIndex = selectedindex;
                }
            }
            else if(type == "longtext")
            {
                control = document.createElement("textarea");
                if(initial !== undefined)
                {
                    control.value = initial;
                }
                else
                {
                    control.value = "";
                }
            }
            else if(type == "bool")
            {
                control = document.createElement("input");
                control.type = "checkbox";
                if(initial !== undefined)
                {
                    if(typeof(initial) != "boolean")
                    {
                        throw new Error(errorprefix + "initial/default of type 'bool' has to be boolean (true/false)");
                    }
                    control.checked = initial;
                }
                else
                {
                    control.checked = false;
                }
            }
            paramControls.push(control);
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            var label = paramdef.name + ":";
            if('caption' in paramdef)
            {
                label = paramdef.caption;
            }
            if('visible' in paramdef)
            {
                tr.style.display = (paramdef.visible) ? "table-row" : "none";
            }

            td.innerHTML = label;
            tr.appendChild(td);
            td = document.createElement("td");
            td.appendChild(control);
            tr.appendChild(td);
            tablerows.push(tr);
        }
        var that = this;
        tablerows.map(function(tr){
            that.parameterstable.appendChild(tr);
        });
        this.paramControls = paramControls;
    }
};

/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

var Detector = {

    canvas: !! window.CanvasRenderingContext2D,
    webgl: ( function () { try { var canvas = document.createElement( 'canvas' ); return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) ); } catch( e ) { return false; } } )(),
    workers: !! window.Worker,
    fileapi: window.File && window.FileReader && window.FileList && window.Blob,

    getWebGLErrorMessage: function () {

        var element = document.createElement( 'div' );
        element.id = 'webgl-error-message';
        element.style.fontFamily = 'monospace';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'normal';
        element.style.textAlign = 'center';
        element.style.background = '#fff';
        element.style.color = '#000';
        element.style.padding = '1.5em';
        element.style.width = '400px';
        element.style.margin = '5em auto 0';

        if ( ! this.webgl ) {

            element.innerHTML = window.WebGLRenderingContext ? [
                'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
                'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
            ].join( '\n' ) : [
                'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
                'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'
            ].join( '\n' );

        }

        return element;

    },

    addGetWebGLMessage: function ( parameters ) {

        var parent, id, element;

        parameters = parameters || {};

        parent = parameters.parent !== undefined ? parameters.parent : document.body;
        id = parameters.id !== undefined ? parameters.id : 'oldie';

        element = Detector.getWebGLErrorMessage();
        element.id = id;

        parent.appendChild( element );

    }

};

// browserify support
if ( typeof module === 'object' ) {

    module.exports = Detector;

}

