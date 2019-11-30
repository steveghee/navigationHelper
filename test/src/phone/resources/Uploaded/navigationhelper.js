//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//steve's positional helper library
//

function spatialHelper(targets, renderer) {
  
  // constructor
  this.nsteps       = 30;
  this.tunneling    = false;
  this.showTunnel   = false;
  this.headloc      = undefined;
  this.target       = targets === undefined ? {} : targets;
  this.target.loc   = {position:new Vector4(), gaze:new Vector4().Set3a([0,0,-1])};
  this.target.tname = this.target.device != undefined ? "target" : undefined;
  this.target.fname = this.target.feet   != undefined ? "feet"   : undefined;
  this.target.hname = this.target.head   != undefined ? "head"   : undefined;
  this.floorOffset  = 0;
  this.tunnelGeom   = "app/resources/Uploaded/Sphere.pvz";
  this.cutoff       = 0.5;
  this.autoCutoff   = false;
  this.triggered    = undefined;
  
  // we are initialised asynchronously, so we need the caller to pass in
  // certain 'capabilities; e.g. the renderer
  this.renderer     = renderer;
  
  ///////////////////////////////////////////////////////////////////////////////////////
  // public API
  //
  this.setAt = function(locator) {
  
    if (locator != undefined) {
    
      this.target.loc = this._positionHelpers( { position:locator.position.v, 
                                                     gaze:locator.gaze.v, 
                                                       up:locator.up.v });
    
    }
    else {
        this._toggleTunnel(false); 
    }
    return this;
  }
  
  this.showAt = function(locator) {
    this.setAt(locator);
    if (locator != undefined) 
      this.show();
    return this;
  }
  
  this.setAtCurrent = function() {
    // switch the endpoint to be the current headlocation
    this.target.loc = this._positionHelpers(this.headloc);
    return this;
  }
  
  this.get = function() {
    return this.target.loc;
  }
  
  this.hide = function() {
    this._toggleTunnel(false);
    return this;
  }
  
  this.show = function() {
    this._toggleTunnel(true);
    return this;
  }
  
  this.draw = function(arg) {

    if (this.tunneling) {

      //
      // draw a tunnel to this point, from the camera location
      var d = this._drawTunnel( {from:arg.position, 
                                 gaze:arg.gaze, 
                                   up:arg.up });
    
      this.tunneling = this.showTunnel;
      if (d < this.cutoff) {
        
      	// turn tunnel effect off when we get close?
        if (this.autoCutoff === true) {
        	$scope.helper.hide();
        } 
        
        // and inform the user?
        if (this.triggered != undefined) this.triggered(this,d);
      }

    }
    
    // and keep a record of the head position
    this.headloc = arg;

  }
  
  this.Steps  = function(steps)  { this.nsteps = steps;  return this; }
  this.Offset = function(offset) { this.offset = offset; return this; }
  this.Cutoff = function(cutoff,auto,triggered) { 
    if (auto != undefined) {
      this.autoCutoff = auto;
      this.cutoff     = cutoff  
    } else {
      this.autoCutoff = false;
      this.cutoff     = (cutoff != undefined) ? cutoff : 0.5;
    }
    this.triggered = triggered;
    return this;
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // private API
  this._drawTunnel = function(arg) {
    
    var pu = new Vector4().Set3a(arg.up);	// 
    var p0 = this.target.loc.position;      // staring point
    var p3 = new Vector4().Set3a(arg.from); // end point
    var gd = p0.Sub(p3).Length();
    var p1 = p0.Sub(this.target.loc.gaze.Normalize().Scale(0.2*gd)); // incoming direction
    var gz = new Vector4().Set3a(arg.gaze);
    var pg = gz.Scale(gd).Add(p3);
    var p2 = pg.Scale(2).Sub(p0);
    
    // here we go : classic cubic bezier spline curve
    //
    var nsp1 = this.nsteps;
    for (var i=1; i<nsp1; i++) {
    
      var img = "tunnel"+i;
   
   	  //
      // precalculate some coefficients
      //
      var t    = i/nsp1;
      var omt  = 1-t;
      var omt2 = omt*omt;
      var omt3 = omt*omt2;
      var t2   = t*t;
      var t3   = t*t2;
    
      //
      //cubic bezier               B(t) = (1-t)^3.P0 + 3t(1-t)^2.P1 + 3t^2.(1-t).P2 + t^3.P3
      //
      var bt   = p0.Scale(omt3).Add(p1.Scale(3*omt2*t)).Add(p2.Scale(3*t2*omt)).Add(p3.Scale(t3));
    
      this.renderer.setTranslation(img,bt.v[0],bt.v[1],bt.v[2]);
    
      //
      //cubic differential tangent B'(t) = 3(1-t)^2.(P1-P0) + 6t.(1-t).(P2-P1) + 3t^2.(P3-P2)
      //
      var bdt = p1.Sub(p0).Scale(3*omt2).Add(p2.Sub(p1).Scale(6*t*omt)).Add(p3.Sub(p2).Scale(3*t2)).Normalize();
    
      //
      // 1. if we get close (within 0.5m) start fading
      //
      this.renderer.setProperties(img,{ shader:"fogged", opacity : (gd - 0.5), hidden: !this.showTunnel }); 
        
      //
      // finally, distance scaling of the rings
      //
      var st = (i + 1) * 0.03 * gd / (this.nsteps + 1); 
      this.renderer.setScale(img,st,st,st);
    }

    //
    // finally, the work out our xz (floor plane) distance from the stepHelp, and if we are within 0.5m, disable the 
    // tunnel. as we get close, fade the floor marker (using the shader fade property).
    //
    var pgd = p3.Distance(p0,[1,0,1]);
    if (this.target.fname != undefined) 
      this.renderer.setProperties (this.target.fname,{shader:"pinger;rings f 5;r f 0;g f 1;direction f -1;fade f "+(1 - (pgd - 0.5)), hidden:false});
  
    return pgd;
  }
  
  this._toggleTunnel = function(force) {
  
    // override if allowed
    this.showTunnel = force != undefined ? force 
                                         : !this.showTunnel;
  
    if (this.showTunnel === true) {

      this.tunneling = this.showTunnel;
 
      if (this.target.tname != undefined) 
      this.renderer.setProperties (this.target.tname,{shader:"foggedLit", 
                                                      hidden:false });
      if (this.target.fname != undefined) 
      this.renderer.setProperties (this.target.fname,{shader:"pinger",    
                                                      hidden:false });
      if (this.target.hname != undefined) 
      this.renderer.setProperties (this.target.hname,{shader:"foggedLit",    
                                                      hidden:false });
    
    }  else {
    
      if (this.target.tname != undefined) 
      this.renderer.setProperties (this.target.tname,{shader:"foggedLit", 
                                                      hidden:true});
      if (this.target.fname != undefined) 
      this.renderer.setProperties (this.target.fname,{shader:"pinger",    
                                                      hidden:true});
      if (this.target.hname != undefined) 
      this.renderer.setProperties (this.target.hname,{shader:"foggedLit",    
                                                      hidden:true});
    }
  }
  
  this._positionHelpers = function(headloc) {
    var vp = new Vector4().Set3a(headloc.position);
    var gp = new Vector4().Set3a(headloc.gaze);
    var ep = gp.Scale(0.1).Add(vp);	// position 10cm in front of where device says it is
    
    //
    // lets get the gaze (vector) and the up (vector)
    var gaze  = new Vector4().Set3 (-headloc.gaze[0],-headloc.gaze[1],-headloc.gaze[2]);  
    var up    = new Vector4().Set3a( headloc.up ); 
    var xd    = up.CrossP(gaze);
    var nup   = gaze.CrossP(xd); // recalc up
  
    // from gaze, up  we calculate the bitangent (nup) and from this we can calculate the view matrix
    var em = new Matrix4().Set3V(xd,nup,gaze);
    // lets turn the matrix into euler angles
    var es = em.ToEuler(true);
    
    if (this.target.tname != undefined) {
      this.renderer.setTranslation(this.target.tname,ep.v[0],ep.v[1],ep.v[2]);
      this.renderer.setRotation   (this.target.tname,es.attitude, es.heading, es.bank);
      this.renderer.setProperties (this.target.tname,{shader:"foggedLit", hidden:false});
    }

    if (this.target.hname != undefined) {
      var hp = ep.Add(gaze.Scale(0.45));
      this.renderer.setTranslation(this.target.hname,hp.v[0],hp.v[1],hp.v[2]);
      this.renderer.setRotation   (this.target.hname,es.attitude, es.heading, es.bank);
      this.renderer.setProperties (this.target.hname,{shader:"foggedLit", hidden:false});
    }

    if (this.target.fname != undefined) {
      var fup = new Vector4().Set3(0,1,0);
      // work out the horizontal gaze vector (remove vertical offset)
      var hg  = new Vector4().Set3(gaze.v[0],0,gaze.v[2]).Normalize();
          xd  = fup.CrossP(hg);
          em  = new Matrix4().Set3V(xd,fup,hg);
      // the feet (image) need to be flipped -90 to align to floor
      var r90 = new Matrix4().Rotate([1,0,0],90,true).Multiply(em.m);
      var esf = r90.ToEuler(true);
      // feet are positioned 0.5m back from the target
      var fp  = new Vector4().Set3(ep.v[0], - this.floorOffset, ep.v[2]).Add(hg.Scale(0.5));
    
      this.renderer.setScale      (this.target.fname, 1,            1,           1       );
      this.renderer.setTranslation(this.target.fname, fp.v[0],      fp.v[1],     fp.v[2] ); 
      this.renderer.setRotation   (this.target.fname, esf.attitude, esf.heading, esf.bank);
      this.renderer.setProperties (this.target.fname, {shader:"pinger;rings f 5;r f 0;g f 1;direction f -1", 
                                                       hidden:false});
    }
    
    //
    // switch the endpoint to be the current headlocation
    var targetloc = {position:vp, gaze:gp, up:up};
    return targetloc;
  }
  
  this.tunnel_objects = (function(obj) {
    var shapes = [];
    for (var i=1; i< obj.nsteps; i++) {
     
      // declare using pvz
      shapes.push( {name:"tunnel"+i, 
                     src:obj.tunnelGeom}); 
     
      // optional - declare as images (see below) 
      // shapes.push( {name:"tunnel"+i, src:"app/resources/Uploaded/arrow.png?name=img"});
    }
    return shapes;
  })(this);

  this.nav_objects = (function(obj) {
    var shapes = [];
    
    // declare models
    if (obj.target.tname != undefined) shapes.push( {name:obj.target.tname, src:obj.target.device } ); 
    if (obj.target.hname != undefined) shapes.push( {name:obj.target.hname, src:obj.target.head   } ); 
    
    return shapes;
  })(this);
  
  this.nav_images = (function(obj) {
    var shapes = [];
    
    // declare images
    if (obj.target.fname != undefined) shapes.push( {name:obj.target.fname, src:obj.target.feet } ); 
     
    return shapes;
  })(this);
  
}


//
// declare the tunnel dynamically (see tml widget for the ng-repeat that uses this data)
//

/*

// this is the tml for the tunnel
//
<div ng-repeat="obj in helper.tunnel_objects">
  <twx-dt-model id="{{obj.name}}" 
                           x="0" y="0" z="0" opacity="1.0"
                           rx="0" ry="0" rz="0" 
                           src="{{obj.src}}" 
                           hidden="true"
                           shader="fogged"
                           color="rgba(255,255,25,1);"
                           >
  </twx-dt-model>
</div>
<div ng-repeat="obj in helper.nav_objects">
  <twx-dt-model id="{{obj.name}}" 
                           x="0" y="0" z="0" opacity="1.0"
                           rx="0" ry="0" rz="0"
                           src="{{obj.src}}" 
                           hidden="false"
                           >
  </twx-dt-model>
</div>
<div ng-repeat="obj in helper.nav_images">
  <twx-dt-image id="{{obj.name}}" 
                           x="0" y="0" z="0" opacity="1.0"
                           rx="-90" ry="0" rz="0"                           
                           height="0.5" width="0.5"
                           src="{{obj.src}}" 
                           hidden="false"
                           shader="pinger"
                           >
  </twx-dt-model>
</div>
*/

exports.spatialHelper = spatialHelper;



//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//steve's simple matrix/vector library
//
function Matrix4() {
  this.m = [ [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]];
  this.Set3V = function(v1,v2,v3) {
    this.m[0][0] = v1.v[0];
    this.m[0][1] = v1.v[1];
    this.m[0][2] = v1.v[2];
    this.m[1][0] = v2.v[0];
    this.m[1][1] = v2.v[1];
    this.m[1][2] = v2.v[2];
    this.m[2][0] = v3.v[0];
    this.m[2][1] = v3.v[1];
    this.m[2][2] = v3.v[2];
    return this;
  }
  this.Translate = function (x, y, z) {
    var t = [ [1, 0, 0, 0],
             [0, 1, 0, 0],
             [0, 0, 1, 0],
             [x, y, z, 1]];
    return this.Multiply(t);
  }
  this.Scale = function (x, y, z) {
    var s = [ [x, 0, 0, 0],
             [0, y, 0, 0],
             [0, 0, z, 0],
             [0, 0, 0, 1]];
    return this.Multiply(s);
  }
  this.Rotate = function (axis, angle, fromDeg) {
    var deg = (fromDeg != undefined) ? Math.PI/180 : 1; 
    var s  = Math.sin(angle*deg);
    var c0 = Math.cos(angle*deg);
    var c1 = 1 - c0;
    // assume normalised input vector
    var u = axis[0];
    var v = axis[1];
    var w = axis[2];
    var r = [
      [(u * u * c1) + c0,      (u * v * c1) - (w * s), (u * w * c1) + (v * s), 0],
      [(u * v * c1) + (w * s), (v * v * c1) + c0,      (v * w * c1) - (u * s), 0],
      [(u * w * c1) - (v * s), (v * w * c1) + (u * s), (w * w * c1) + c0,      0],
      [0,                      0,                      0,                      1]
    ];
    return this.Multiply(r);
  }
  this.Multiply = function (b) {
    var dst = [ 
      [   ((this.m[0][0] * b[0][0]) + (this.m[0][1] * b[1][0]) + (this.m[0][2] * b[2][0]) + (this.m[0][3] * b[3][0])),
          ((this.m[0][0] * b[0][1]) + (this.m[0][1] * b[1][1]) + (this.m[0][2] * b[2][1]) + (this.m[0][3] * b[3][1])),
          ((this.m[0][0] * b[0][2]) + (this.m[0][1] * b[1][2]) + (this.m[0][2] * b[2][2]) + (this.m[0][3] * b[3][2])),
          ((this.m[0][0] * b[0][3]) + (this.m[0][1] * b[1][3]) + (this.m[0][2] * b[2][3]) + (this.m[0][3] * b[3][3])) ],
      [   ((this.m[1][0] * b[0][0]) + (this.m[1][1] * b[1][0]) + (this.m[1][2] * b[2][0]) + (this.m[1][3] * b[3][0])),
          ((this.m[1][0] * b[0][1]) + (this.m[1][1] * b[1][1]) + (this.m[1][2] * b[2][1]) + (this.m[1][3] * b[3][1])),
          ((this.m[1][0] * b[0][2]) + (this.m[1][1] * b[1][2]) + (this.m[1][2] * b[2][2]) + (this.m[1][3] * b[3][2])),
          ((this.m[1][0] * b[0][3]) + (this.m[1][1] * b[1][3]) + (this.m[1][2] * b[2][3]) + (this.m[1][3] * b[3][3])) ],
      [   ((this.m[2][0] * b[0][0]) + (this.m[2][1] * b[1][0]) + (this.m[2][2] * b[2][0]) + (this.m[2][3] * b[3][0])),
          ((this.m[2][0] * b[0][1]) + (this.m[2][1] * b[1][1]) + (this.m[2][2] * b[2][1]) + (this.m[2][3] * b[3][1])),
          ((this.m[2][0] * b[0][2]) + (this.m[2][1] * b[1][2]) + (this.m[2][2] * b[2][2]) + (this.m[2][3] * b[3][2])),
          ((this.m[2][0] * b[0][3]) + (this.m[2][1] * b[1][3]) + (this.m[2][2] * b[2][3]) + (this.m[2][3] * b[3][3])) ],
      [   ((this.m[3][0] * b[0][0]) + (this.m[3][1] * b[1][0]) + (this.m[3][2] * b[2][0]) + (this.m[3][3] * b[3][0])),
          ((this.m[3][0] * b[0][1]) + (this.m[3][1] * b[1][1]) + (this.m[3][2] * b[2][1]) + (this.m[3][3] * b[3][1])),
          ((this.m[3][0] * b[0][2]) + (this.m[3][1] * b[1][2]) + (this.m[3][2] * b[2][2]) + (this.m[3][3] * b[3][2])),
          ((this.m[3][0] * b[0][3]) + (this.m[3][1] * b[1][3]) + (this.m[3][2] * b[2][3]) + (this.m[3][3] * b[3][3])) ]];
    this.m = dst;
    return this;
  }
  this.makeOrtho = function(left, right, bottom, top, znear, zfar) {
    var X = -(right + left) / (right - left);
    var Y = -(top + bottom) / (top - bottom);
    var Z = -(zfar + znear) / (zfar - znear);
    var A = 2 / (right - left);
    var B = 2 / (top - bottom);
    var C = -2 / (zfar - znear);
    this.m = [[A, 0, 0, 0],
              [0, B, 0, 0],
              [0, 0, C, 0],
              [X, Y, Z, 1]];
    return this;
  }
  this.makePerspective = function(fovy, aspect, znear, zfar) {
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;
    this.makeFrustum(xmin, xmax, ymin, ymax, znear, zfar);
    return this;
  }
  this.makeFrustum = function(left, right, bottom, top, znear, zfar) {
    var X = 2 * znear / (right - left);
    var Y = 2 * znear / (top - bottom);
    var A = (right + left) / (right - left);
    var B = (top + bottom) / (top - bottom);
    var C = -(zfar + znear) / (zfar - znear);
    var D = -2 * zfar * znear / (zfar - znear);
    this.m = [[X, 0, 0, 0],
              [0, Y, 0, 0],
              [A, B, C, -1],
              [0, 0, D, 1]];
    return this;
  }
  this.Flatten = function () {
    var f = [];
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4 ; j++) {
        f.push(this.m[i][j]);
      }
    }
    return f;
  }
  this.ToString = function () {
    var s = '';
    for (var i = 0; i < 4; i++) {
      s = s.concat(this.m[i].toString());
      s = s.concat(',');
    }
    // now replace the commas with spaces
    s = s.replace(/,/g, ' ');
    return s;
  }
  this.ToEuler = function(toDeg) {
    
        // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
        var m11 = this.m[0][0], m12 = this.m[1][0], m13 = this.m[2][0];
        var m21 = this.m[0][1], m22 = this.m[1][1], m23 = this.m[2][1];
        var m31 = this.m[0][2], m32 = this.m[1][2], m33 = this.m[2][2];
        var sy = Math.sqrt(m32 * m32 + m33 * m33);
     
        var singular = (sy < 0.000001) ? true : false;
        var _x, _y, _z;
        
        if (singular === false) {
            _x = Math.atan2(  m32, m33);
            _y = Math.atan2(- m31, sy);
            _z = Math.atan2(  m21, m11);
        } else {
            _x = Math.atan2(- m32, m22);
            _y = Math.atan2(- m31, sy);
            _z = 0;
        }
        
        // convert to degrees?
        var deg = (toDeg != undefined) ? 180.0/Math.PI : 1; 
        var attitude = deg * _x; // make this left handed
        var heading  = deg * _y;
        var bank     = deg * _z;
        
        return { 
          attitude:attitude, 
          heading :heading, 
          bank    :bank 
        };
  }
}
// quick way to do perspective matrices
function MatrixP() {
}
MatrixP.prototype = new Matrix4()
function MatrixP(fovy, aspect, znear, zfar) {
  this.makePerspective(fovy, aspect, znear, zfar);
}
// quick way to do orthographic matrices
function MatrixO() {
}
MatrixO.prototype = new Matrix4()
function MatrixO(left, right, bottom, top, znear, zfar) {
  this.makeOrtho(left, right, bottom, top, znear, zfar);
}

//
// vector4
//
function Vector4() {
  this.v = [0, 0, 0, 1];
  this.Set = function (x) {
    this.v[0] = x.v[0];
    this.v[1] = x.v[1];
    this.v[2] = x.v[2];
    return this;
  }
  this.Set3 = function (x, y, z) {
    this.v[0] = x;
    this.v[1] = y;
    this.v[2] = z;
    return this;
  }
  this.Set3a = function (a) {
    this.v[0] = a[0];
    this.v[1] = a[1];
    this.v[2] = a[2];
    return this;
  }
  this.Set4 = function (x, y, z, w) {
    this.v[0] = x;
    this.v[1] = y;
    this.v[2] = z;
    this.v[3] = w;
    return this;
  }
  this.FromString = function (str) {
    var pcs = str.split(',');
    this.v[0] = parseFloat(pcs[0]);
    this.v[1] = parseFloat(pcs[1]);
    this.v[2] = parseFloat(pcs[2]);
    this.v[3] = pcs.length > 3 ? parseFloat(pcs[2]) : 1.0;
    return this;
  }
  this.Length = function () {
    var hyp = (this.v[0] * this.v[0]) + (this.v[1] * this.v[1]) + (this.v[2] * this.v[2]);
    var rad = (hyp > 0) ? Math.sqrt(hyp) : 0;
    return rad;
  }
  this.Distance = function(v2,mask) {
    if (mask === undefined) mask = [1,1,1];
    var x = mask[0]*(this.v[0] - v2.v[0]);
    var y = mask[1]*(this.v[1] - v2.v[1]);
    var z = mask[2]*(this.v[2] - v2.v[2]);
    var hyp = (x * x) + (y * y) + (z* z);
    var dist = (hyp > 0) ? Math.sqrt(hyp) : 0;
    return dist;    
  }
  this.LengthAxis2 = function (aidx) {
    var hyp = (this.v[aids] * this.v[aids]);
    return hyp;
  }
  this.Normalize = function () {
    var rad = this.Length();
    this.v[0] = this.v[0] / rad;
    this.v[1] = this.v[1] / rad;
    this.v[2] = this.v[2] / rad;
    return this;
  }
  this.DotP = function (v2) {
    // cos(theta)
    var cost = (this.v[0] * v2.v[0]) + (this.v[1] * v2.v[1]) + (this.v[2] * v2.v[2]);
    return cost;
  }
  this.CrossP = function (v2) {
    var x = (this.v[1] * v2.v[2]) - (v2.v[1] * this.v[2]);
    var y = (this.v[2] * v2.v[0]) - (v2.v[2] * this.v[0]);
    var z = (this.v[0] * v2.v[1]) - (v2.v[0] * this.v[1]);
    var cross = new Vector4().Set3(x, y, z);
    return cross;
  }
  this.Add = function (v2) {
    var add = new Vector4().Set3(
      (this.v[0] + v2.v[0]),
      (this.v[1] + v2.v[1]),
      (this.v[2] + v2.v[2]));
    return add;
  }
  this.Sub = function (v2) {
    var add = new Vector4().Set3(
      (this.v[0] - v2.v[0]),
      (this.v[1] - v2.v[1]),
      (this.v[2] - v2.v[2]));
    return add;
  }
  this.Scale = function (s) {
    var scale = new Vector4().Set3(this.v[0]*s, this.v[1]*s, this.v[2]*s);
    return scale;
  }
  this.Tween = function(v2,d) {
    // result = a + (b-a).d, assuming d normalised 0..1
    var i = v2.Sub(this).Scale(d).Add(this);
    return i;
  }
  this.Transform = function(b) {
    var dst = new Vector4().Set4(
      ((this.v[0] * b.m[0][0]) + (this.v[1] * b.m[1][0]) + (this.v[2] * b.m[2][0]) + (this.v[3] * b.m[3][0])),
      ((this.v[0] * b.m[0][1]) + (this.v[1] * b.m[1][1]) + (this.v[2] * b.m[2][1]) + (this.v[3] * b.m[3][1])),
      ((this.v[0] * b.m[0][2]) + (this.v[1] * b.m[1][2]) + (this.v[2] * b.m[2][2]) + (this.v[3] * b.m[3][2])),
      ((this.v[0] * b.m[0][3]) + (this.v[1] * b.m[1][3]) + (this.v[2] * b.m[2][3]) + (this.v[3] * b.m[3][3]))
    );
    return dst;
  }
  this.ToString = function () {
    var s = this.v[0].toPrecision(3) + ',' + this.v[1].toPrecision(3) + ',' + this.v[2].toPrecision(3);
    return s;
  }
}

exports.Matrix4 = Matrix4;
exports.MatrixP = MatrixP;
exports.MatrixO = MatrixO;
exports.Vector4 = Vector4;
