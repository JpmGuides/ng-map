this.Utils = {
  assert: function (condition) {
    if (!condition) {
      throw('Assertion failed.');
    }
  },
  
  objectToString: function(o) {
    if (typeof o === 'object') {
      var str = '{';
      for (var i in o) {
        str += i + ': ' + Utils.objectToString(o[i]) + ',';
      }
      str += '}';
      return str;
    } else {
      return '' + o;
    }
  },

  invert3x3Matrix: function(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    var out = [];
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  },
  
  multiply3x3MatrixWithVector: function(A, b) {
    var r = [0, 0, 0];
    for (var i = 0; i < 3; ++i) {
      r[i] = A[i*3 + 0] * b[0] + A[i*3 + 1] * b[1] + A[i*3 + 2] * b[2];
    }
    return r;
  },

  multiply3x3Matrices: function(A, B) {
    var r = new Array(9);
    for (var i = 0; i < 3; ++i) {
      for (var j = 0; j < 3; ++j) {
        r[i * 3 + j] = A[i*3 + 0] * B[0 * 3 + j]
          + A[i*3 + 1] * B[1 * 3 + j]
          + A[i*3 + 2] * B[2 * 3 + j];
      }
    }
    return r;
  },
  
  distance: function(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  eventPosInElementCoordinates: function(event, element) {
    var rect = element.getBoundingClientRect();
    var r = {
      x: (event.clientX - rect.left) * (element.width / element.offsetWidth),
      y: (event.clientY - rect.top) * (element.height / element.offsetHeight)
    };
    Utils.assert(!isNaN(r.x) && !isNaN(r.y));
    return r;
  },

  latLonToWorld: function(coord) {
    var lon = coord[0];
    var lat = coord[1] * Math.PI / 180;
    return {
      x: (lon + 180) / 360,
      y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2)
    };
  },
  worldToLatLon: function(osm) {
    var lon_deg = osm.x * 360.0 - 180.0;
    var n = Math.PI-2*Math.PI*osm.y;
    var lat_deg = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    return {lat: lat_deg, lon: lon_deg};
  },


  worldToTile: function(scale, coord) {
    var getTileX = function(unitX) { return  Math.floor(unitX * (1 << scale)); };
    return {
      scale: scale,
      x: getTileX(coord.x),
      y: getTileX(coord.y)
    };
  }
};

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// creates a global "addWheelListener" method
// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
(function(window,document) {
   if (!document) {
     return;
   }

    var prefix = "", _addEventListener, onwheel, support;

    // detect event model
    if ( window.addEventListener ) {
        _addEventListener = "addEventListener";
    } else {
        _addEventListener = "attachEvent";
        prefix = "on";
    }

    // detect available wheel event
    support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
              document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
              "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

    window.addWheelListener = function( elem, callback, useCapture ) {
        _addWheelListener( elem, support, callback, useCapture );

        // handle MozMousePixelScroll in older Firefox
        if( support == "DOMMouseScroll" ) {
            _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
        }
    };

    function _addWheelListener( elem, eventName, callback, useCapture ) {
        elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
            !originalEvent && ( originalEvent = window.event );

            // create a normalized event object
            var event = {
                // keep a ref to the original event object
                originalEvent: originalEvent,
                target: originalEvent.target || originalEvent.srcElement,
                type: "wheel",
                deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                deltaX: 0,
                delatZ: 0,
                pageX: originalEvent.pageX,
                pageY: originalEvent.pageY,
                clientX: originalEvent.clientX,
                clientY: originalEvent.clientY,
                preventDefault: function() {
                    originalEvent.preventDefault ?
                        originalEvent.preventDefault() :
                        originalEvent.returnValue = false;
                }
            };
            
            // calculate deltaY (and deltaX) according to the event
            if ( support == "mousewheel" ) {
                event.deltaY = - 1/40 * originalEvent.wheelDelta;
                // Webkit also support wheelDeltaX
                originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
            } else {
                event.deltaY = originalEvent.detail;
            }

            // it's time to fire the callback
            return callback( event );

        }, useCapture || false );
    }

})(window,document);

/**
 * Provides requestAnimationFrame in a cross browser way.
 * @author paulirish / http://paulirish.com/
 */
if ( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = ( function() {

        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
        function( /* function FrameRequestCallback */ callback,
                  /* DOMElement Element */ element ) {
            window.setTimeout( callback, 1000 / 60 );
        };

    } )();
};
function AffineTransform(transform) {
  if (transform instanceof Array && transform.length == 6) {
    this.matrix = transform.slice(0);
  } else if (transform && transform.matrix) {
    this.matrix = transform.matrix.slice(0);
  } else {
    this.matrix = [1,0,0, 0,1,0];
  }
}

AffineTransform.prototype.transform = function (x_, y_) {
  var x = (typeof(x_) == "object" ? x_.x : x_);
  var y = (typeof(x_) == "object" ? x_.y : y_);
  
  return {
    x: this.matrix[0] * x + this.matrix[1] * y + this.matrix[2],
    y: this.matrix[3] * x + this.matrix[4] * y + this.matrix[5]
  };
};

AffineTransform.prototype.getInverse = function() {
  // We want u,v where
  // a b * u + e = x
  // c d   v   f = y
  var a = this.matrix[0];
  var b = this.matrix[1];
  var c = this.matrix[3];
  var d = this.matrix[4];

  var invdet = 1 / (a * d - b * c);

  return new AffineTransform([
    d * invdet,
    - b * invdet,
    - b * this.matrix[5] * invdet - d * this.matrix[2] * invdet,
    -c * invdet,
    a * invdet,
    - a * this.matrix[5] * invdet + c * this.matrix[2] * invdet
  ]);
};  

AffineTransform.prototype.inverseTransform = function (x_, y_) {
  return this.getInverse().transform(x_, y_);
};

AffineTransform.prototype.scale = function (scaleFactor) {
  this.matrix[0] *= scaleFactor;
  this.matrix[1] *= scaleFactor;
  this.matrix[3] *= scaleFactor;
  this.matrix[4] *= scaleFactor;
};

AffineTransform.prototype.canvasSetTransform = function(canvas) {
  var t = this.matrix;
  canvas.setTransform(t[0], t[3], t[1], t[4], t[2], t[5]);
};
/**
 * @author Julien Pilet
 */

function PinchZoom(element, transformChanged, width, height) {
  this.ongoingTouches = {};
  this.transform = new AffineTransform();
  this.transformChanged = transformChanged;
  this.worldWidth = width || 1;
  this.worldHeight = height || 1;
  this.lastMouseDown = 0;
  this.lastMouseUp = 0;
  this.lastTouchDown = 0;
  this.lastTouchDownPos = {x:-1, y:-1};
  this.minScale = 0;

  // if true, the map will always fill the screen, ie the user wont be able
  // to zoom out when either the full width or full height of the map is visible.
  // If false, borders will appear, and zooming out is authorized until the 
  // full map is visible.
  this.fillScreen = false;
  
  var t = this;
  var e = element;

  this.currentTouchEventHandler = this;
  this.touchEventHandlers = [ this ];

  e.addEventListener("touchstart", function(event) {
      t.selectEventHandlerTouchStart(event);
      t.currentTouchEventHandler.handleStart(event);
    }, false);
  e.addEventListener("touchend", function(event) {
      t.currentTouchEventHandler.handleEnd(event);
    }, false);
  e.addEventListener("touchcancel", function(event) {
      t.currentTouchEventHandler.handleEnd(event);
    }, false);
  e.addEventListener("touchmove", function(event) {
      t.currentTouchEventHandler.handleMove(event);
    }, false);
  e.addEventListener("mousedown", function(event) {
      t.selectEventHandlerMouse(event, 'mouseDown');
      t.currentTouchEventHandler.handleMouseDown(event);
    }, false);
  e.addEventListener("mousemove", function(event) {
      t.currentTouchEventHandler.handleMouseMove(event);
    }, false);
  e.addEventListener("mouseup", function(event) {
      t.currentTouchEventHandler.handleMouseUp(event);
    }, false);
  addWheelListener(element, function(event) {
      t.selectEventHandlerMouse(event, 'wheel');
      t.currentTouchEventHandler.handleMouseWheel(event);
    });
  
  element.pinchZoomInstance = this;
  this.element = element;
}

PinchZoom.prototype.eventElement = function(event) {
  if (event.srcElement) { return event.srcElement; }
  else if (event.currentTarget) { return event.currentTarget; }
  else {
    return undefined;
  }
};

PinchZoom.prototype.setTransform = function(transform) {
  var newTransform = new AffineTransform(transform);
  if (!this.checkAndApplyTransform(newTransform)) {
    return;
  }

  // The transform has changed: ongoing gesture has to be reset.
  var viewerPos = Utils.eventPosInElementCoordinates(event, this.eventElement(event));
  if (this.ongoingTouches.mouse) {
    var viewerPos =  this.ongoingTouches.mouse.startViewerPos;
    this.ongoingTouches.mouse.startWorldPos = this.worldPosFromViewerPos(viewerPos.x, viewerPos.y);
  } else {
    this.ongoingTouches = {};
  }
};

PinchZoom.prototype.worldPosFromViewerPos = function(x, y) {
  return this.transform.inverseTransform(x, y);
};

PinchZoom.prototype.viewerPosFromWorldPos = function(x, y) {
  return this.transform.transform(x, y);
};

PinchZoom.prototype.worldDistanceFromViewerDistance = function(d) {
  // W(x) - W(x+d)
  // = A * x + b - (A * (x + d) + b)
  // = A * x + b - A * x - A * d - b
  // = -A * d
  return this.transform.getInverse().matrix[0] * d;
};

PinchZoom.prototype.viewerDistanceFromWorldDistance = function(d) {
  return this.transform.matrix[0] * d;
}

PinchZoom.prototype.isMoving = function() {
  // We're moving if at least one touch moved at least 1 pixel
  for (var i in this.ongoingTouches) {
    var touch = this.ongoingTouches[i];
    if (touch && touch.currentViewerPos) {
      var dist = Utils.distance(touch.currentViewerPos,
                                touch.startViewerPos);
      if (dist > 1) {
        return true;
      }
    }
  }
  return false;
};

PinchZoom.prototype.handleDoubleClic = function(viewerPos) {
    var constraints = [{
      viewer: viewerPos,
      world: this.worldPosFromViewerPos(viewerPos.x, viewerPos.y),
    }];
  
    this.transform.scale(2);
    this.processConstraints(constraints);
};

PinchZoom.prototype.clicPosFromViewerPos = function(viewerPos) {
  return {
      startWorldPos: this.worldPosFromViewerPos(viewerPos.x, viewerPos.y),
      startViewerPos: viewerPos,
    };
};

PinchZoom.prototype.acceptTouchEvent = function() { return true; };

PinchZoom.prototype.selectEventHandlerMouse = function(event, type) {
  event.preventDefault();
  var viewerPos = Utils.eventPosInElementCoordinates(
      event, this.element);
  this.selectEventHandler(viewerPos, type);
};

PinchZoom.prototype.selectEventHandler = function(viewerPos, type) {
  var worldPos = this.worldPosFromViewerPos(viewerPos.x, viewerPos.y);

  for (var i = this.touchEventHandlers.length - 1; i >= 0; --i) {
    if (this.touchEventHandlers[i].acceptTouchEvent(viewerPos, worldPos, type)) {
      this.currentTouchEventHandler = this.touchEventHandlers[i];
      return;
    }
  }
};

PinchZoom.prototype.handleMouseDown = function(event) {
  var viewerPos = Utils.eventPosInElementCoordinates(event, this.element);

  var now = event.timeStamp;
  if ((now - this.lastMouseDown) < 200) {
    // double clic: instant zoom.
    this.handleDoubleClic(viewerPos);
    this.ongoingTouches.mouse = undefined;
    clearTimeout(this.singleClicTimeout);
  } else {
    // simple clic - might be converted in a double clic later.
    var clicPos = this.clicPosFromViewerPos(viewerPos);
    this.ongoingTouches.mouse = clicPos;
    var t = this;
    this.singleClicTimeout = setTimeout(
        function() {
          // Make sure this is not a long clic or a drag.
          if (t.lastMouseUp > t.lastMouseDown &&
              (t.lastMouseUp - t.lastMouseDown) < 200) {
            t.handleSingleClic(clicPos);
          }
        }, 200);
  }
  this.lastMouseDown = now;
};

PinchZoom.prototype.handleMouseUp = function(event) {
  this.lastMouseUp = event.timeStamp;
  event.preventDefault();
  this.handleMouseMove(event);
  this.ongoingTouches.mouse = undefined;
};

PinchZoom.prototype.handleMouseMove = function(event) {
  event.preventDefault();
  
  if (this.ongoingTouches.mouse) {
    this.ongoingTouches.mouse.currentViewerPos = Utils.eventPosInElementCoordinates(event, this.element);
    var constraints = [{
      viewer: this.ongoingTouches.mouse.currentViewerPos,
      world: this.ongoingTouches.mouse.startWorldPos,
    }];
    this.processConstraints(constraints);
  }
};

PinchZoom.prototype.handleMouseWheel = function(event) {
  event.preventDefault();
  
  var viewerPos = Utils.eventPosInElementCoordinates(event, this.element);
  var constraints = [{
      viewer: viewerPos,
      world: this.worldPosFromViewerPos(viewerPos.x, viewerPos.y),
  }];
  var scaleFactor = 1.0 - Math.max(-.2, Math.min(.2, event.deltaY / 20.0));
  
  this.transform.scale(scaleFactor);
  this.processConstraints(constraints);
};

PinchZoom.prototype.selectEventHandlerTouchStart = function(event) {
  event.preventDefault();
  if (event.touches.length != 1) {
    // no change in event handler if touches are already ongoing
    return;
  }

  var viewerPos = Utils.eventPosInElementCoordinates(
      event.touches[0], this.element);
  this.selectEventHandler(viewerPos, 'touchStart');
};

PinchZoom.prototype.handleStart = function(event) {
  event.preventDefault();

  // Detect double clic, single touch.
  if (event.touches.length == 1) {
    var now = event.timeStamp;
    var delta = (now - this.lastTouchDown);
    var viewerPos = Utils.eventPosInElementCoordinates(
        event.touches[0], this.element);
    var dist = Utils.distance(viewerPos, this.lastTouchDownPos);
    // double tap ?
    if (delta < 300 && dist < 100) {
      this.handleDoubleClic(viewerPos);
    }
    this.lastTouchDown = now;
    this.lastTouchDownPos = viewerPos;
  }

  var touches = event.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var viewerPos = Utils.eventPosInElementCoordinates(touches[i], this.element);

    this.ongoingTouches[touches[i].identifier] = {
startWorldPos: this.worldPosFromViewerPos(viewerPos.x, viewerPos.y),
               startViewerPos: viewerPos,
    };
  }
};
	
PinchZoom.prototype.handleEnd = function(event) {
  event.preventDefault();


  if (event.touches.length == 0) {
    // No finger left on the screen. Was it a single tap?
    var now = event.timeStamp;
    var delta = (now - this.lastTouchDown);
    if (delta < 300) {
      // yes!
      for (var i in this.ongoingTouches) {
        this.handleSingleClic(this.ongoingTouches[i]);
        break;
      }
      this.ongoingTouches = {};
      return;
    }
  }

  // If one finger leaves the screen, we forget all finger positions. Thus, it
  // starts a new motion if some other fingers keep moving.
  this.ongoingTouches = {};
  this.handleMove(event);
};

PinchZoom.prototype.handleMove = function(event) {
  event.preventDefault();
  var touches = event.touches;
  var constraints = [];
  for (var i = 0; i < touches.length; i++) {
		if (!this.ongoingTouches[touches[i].identifier]) {
			// For some reason, we did not get the start event.
			var viewerPos = Utils.eventPosInElementCoordinates(touches[i], this.element);
		  this.ongoingTouches[touches[i].identifier] = {
			  startWorldPos: this.worldPosFromViewerPos(viewerPos.x, viewerPos.y),
			  startViewerPos: viewerPos,
		  };
		}
		var touch = this.ongoingTouches[touches[i].identifier];
		
                touch.currentViewerPos =
                  Utils.eventPosInElementCoordinates(touches[i], this.element);

		// Every touch is a constraint
		constraints.push({
			viewer: touch.currentViewerPos,
			world: touch.startWorldPos,
		});
  }
  this.processConstraints(constraints);
};

PinchZoom.prototype.processConstraints = function(constraints) {
  // Compute the transform that best fits the constraints
  var newTransform = new AffineTransform(this.transform.matrix);
  var T = newTransform.matrix;

  if (constraints.length >= 2) {
    // pinch -> zoom
    // solve:
    //   s * worldx + tx = viewerx
    //   s * worldy + ty = viewery
    // For each constraint:
    //  worldx 1 0  * s  = viewerx
    //  worldy 0 1    tx   viewery
    //                ty
    // Let A be the 4 by 3 matrix composed of the two constraints, as shown above.
    // The solution is computed with: [s tx ty]' = inverse(A' * A) * A' [viewerx viewery]'
    var wx1 = constraints[0].world.x;
    var wy1 = constraints[0].world.y;
    var wx2 = constraints[1].world.x;
    var wy2 = constraints[1].world.y;
    var vx1 = constraints[0].viewer.x;
    var vy1 = constraints[0].viewer.y;
    var vx2 = constraints[1].viewer.x;
    var vy2 = constraints[1].viewer.y;

    var AtA00 = wx1*wx1 + wx2*wx2 + wy1*wy1 + wy2*wy2;
    var AtA10 = wx1 + wx2;
    var AtA20 = wy1 + wy2;
    var Ainv = Utils.invert3x3Matrix([AtA00, AtA10, AtA20, AtA10, 2, 0, AtA20, 0, 2]);
    var AtB = [vx1*wx1 + vx2*wx2 + vy1*wy1 + vy2*wy2, vx1 + vx2, vy1 + vy2];
    var r = Utils.multiply3x3MatrixWithVector(Ainv, AtB);

    T[0] = T[4] = r[0];
    T[2] = r[1];
    T[5] = r[2];    

    var c = {
      world: {
        x: (constraints[0].world.x + constraints[1].world.x) / 2,
        y: (constraints[0].world.y + constraints[1].world.y) / 2,
      },
      viewer: {
        x: (constraints[0].viewer.x + constraints[1].viewer.x) / 2,
        y: (constraints[0].viewer.y + constraints[1].viewer.y) / 2,
      }
    };

    this.enforceConstraints(newTransform, c.world);

    // If enforceConstraints changed scale, we need to reset translation.
    T[2] = c.viewer.x - (T[0] * c.world.x + T[1] * c.world.y);
    T[5] = c.viewer.y - (T[3] * c.world.x + T[4] * c.world.y);

  } else if (constraints.length == 1) {
    var c = constraints[0];

    // Make sure the scale is within bounds.
    this.enforceConstraints(newTransform, c.world);

    // scroll: Solve A* world + X = viewer
    // -> X = viewer - A * world
    T[2] = c.viewer.x - (T[0] * c.world.x + T[1] * c.world.y);
    T[5] = c.viewer.y - (T[3] * c.world.x + T[4] * c.world.y);
  }

  var tiledViewer = this;
  
  this.checkAndApplyTransform(newTransform);
};

function minDefined(a, b) {
  if (a == undefined) { return b; }
  if (b == undefined) { return a; }
  return Math.min(a, b);
}

function maxDefined(a, b) {
  if (a == undefined) { return b; }
  if (b == undefined) { return a; }
  return Math.max(a, b);
}

PinchZoom.prototype.topLeftWorld = function() {
  return {
    x: maxDefined(this.minX, 0),
    y: maxDefined(this.minY, 0)
  };
}

PinchZoom.prototype.bottomRightWorld = function() {
  return {
      x: minDefined(this.maxX, this.worldWidth),
      y: minDefined(this.maxY, this.worldHeight)
  };
}

PinchZoom.prototype.enforceConstraints = function (newTransform, focusPoint) {
  var T = newTransform.matrix;

  var topLeftWorld = this.topLeftWorld();
  var bottomRightWorld = this.bottomRightWorld();
  var worldWidth = bottomRightWorld.x - topLeftWorld.x;
  var worldHeight = bottomRightWorld.y - topLeftWorld.y;
  var boundScaleX = this.element.width / worldWidth;
  var boundScaleY = this.element.height / worldHeight;
  var scaleBound = (this.fillScreen ?
                    Math.max(boundScaleX, boundScaleY)
                    : Math.min(boundScaleX, boundScaleY));

  if (this.maxScale) {
    scaleBound = Math.max(scaleBound, this.element.width / this.maxScale);
  }

  var scale = T[0];
  var scaleFactor = 1.0;
  if (scale < scaleBound) {
    scaleFactor = scaleBound / scale;
  }

  var minScale = maxDefined(
      this.minScale, this.dynamicMinScale(focusPoint));

  if (minScale > 0) {
      var maxScale = this.element.width / minScale;
      if (scale > maxScale) {
          scaleFactor = maxScale / scale;
      }
  }

  T[0] = T[4] = scale * scaleFactor;
  T[2] *= scaleFactor;
  T[5] *= scaleFactor;
    
  var topleft = newTransform.transform(this.topLeftWorld());
  var bottomright = newTransform.transform(this.bottomRightWorld());
  var width = bottomright.x - topleft.x;
  var height = bottomright.y - topleft.y;

  if (width < this.element.width) {
    T[2] = (T[2] - topleft.x) + (this.element.width - width) / 2;
  } else {
    if (topleft.x > 0) {
      T[2] -= topleft.x;
    }
    if (bottomright.x < this.element.width) {
      T[2] += this.element.width - bottomright.x;
    }
  }

  if (height < this.element.height) {
    T[5] = (T[5] - topleft.y) + (this.element.height - height) / 2;
  } else {
    if (topleft.y > 0) {
      T[5] -= topleft.y;
    }
    if (bottomright.y < this.element.height) {
      T[5] += this.element.height - bottomright.y;
    }
  }
};
  
PinchZoom.prototype.checkAndApplyTransform = function (newTransform) {
  newTransform = newTransform || this.transform;

  this.enforceConstraints(newTransform);

  if (this.transform !== newTransform) {
    this.transform = newTransform;
    if (this.transformChanged) {
      this.transformChanged(this.transform);
    }
  }
};

PinchZoom.prototype.handleSingleClic = function(mousePos) {
  if (this.onClic) {
    this.onClic(mousePos, this);
  }
};

PinchZoom.prototype.dynamicMinScale = function(focusPoint) {
  if (focusPoint == undefined) {
    return undefined;
  }
  var canvas = this.element;
  var layers = canvas.canvasTilesRenderer.layers;

  var minScale;
  for (var i in layers) {
    if (layers[i].minScaleAt) {
      minScale = maxDefined(minScale, layers[i].minScaleAt(canvas, focusPoint));
    }
  }
  return minScale;
};
// CanvasTilesRenderer.js - copyright Julien Pilet, 2013

/** Construct a CanvasTilesRenderer object on a canvas.
 *
 * \param canvas the canvas element to render tiles to.
 * \param url a function taking (scale,x,y) as arguments. Returns a tile URL.
 *            default: openstreetmap.
 * \param initialLocation the initial location (zoom and translation).
 *                        See setLocation().
 * \param tileSize the tileSize, in pixels. Default: 256.
 * \param width the image width. Unit: number of tiles at level 0 (float OK).
 * \param height image height. Unit: number of tiles at level 0.
 * \param maxNumCachedTiles the maximum number of hidden tiles to keep in cache.
 *                          default: 64.
 * \param maxSimultaneousLoads maximum parallel loading operations. Default: 3.
 * \param downgradeIfSlowerFPS If rendering falls below this framerate, degrade
 *                             image quality during animation.
 * \param debug if true, output debug info on console.
 */
function CanvasTilesRenderer(params) {
  this.params = (params != undefined ? params : {});
  this.canvas = params.canvas;
  this.canvas.canvasTilesRenderer = this;
  
  this.params.width = this.params.width || 1;
  this.params.height = this.params.height || 1;
  this.params.minScale = this.params.minScale || 0;
  
  this.params.downgradeIfSlowerFPS = params.downgradeIfSlowerFPS || 15;
  this.params.downsampleDuringMotion = false;

  this.pixelRatio = params.forceDevicePixelRatio || 1;

  this.layers = [
    new TileLayer(params, this)
  ];

  this.canvasWidth = -1;
  this.canvasHeight = -1;

  if (params.debug) {
      this.debug = function(msg) { console.log(msg); }
  } else {
      this.debug = function(msg) { };
  }

  // Block drawing before we are ready.  
  this.inDraw = true;
  this.numDraw = 0;
  this.disableResize = false;
  this.lastRefreshRequest = -1;
  
  var t = this;
  this.pinchZoom = new PinchZoom(t.canvas, function() {
    t.location = t.getLocation();
    if (t.params.onLocationChange) { t.params.onLocationChange(t); }
    if (t.params.debug) {
      t.debug('location: w:' + t.canvas.width
              + ' h:' + t.canvas.height
              + ' x:'+t.location.x + ' y:'+t.location.y
              +' s:'+t.location.scale);
    }
    t.refresh();
  },
  this.params.width,
  this.params.height);
  this.pinchZoom.minScale = this.params.minScale;
  this.pinchZoom.fillScreen = !!this.params.fillScreen;

  ['maxScale', 'maxX', 'maxY', 'minX', 'minY'].forEach(function(key) {
    if (key in t.params) {
      t.pinchZoom[key] = t.params[key];
    }
  });

  // We are ready, let's allow drawing.  
  this.inDraw = false;

  t.clicHandlers = [];
  t.pinchZoom.onClic = function(pos) {
    for(var i=0; i<t.clicHandlers.length; i++) {
      if(t.clicHandlers[i](pos))
        return false;
    }
  }
  

  var location = params.initialLocation || {
    x: (this.params.width || 1) / 2,
    y: (this.params.height || 1) / 2,
    scale: (this.params.width || 1)
  };
  this.setLocation(location);
}

CanvasTilesRenderer.prototype.addLayer = function(layer) {
  this.layers.push(layer);
  this.refreshIfNotMoving();
};

CanvasTilesRenderer.prototype.addClicHandler = function(func) {
  this.clicHandlers.push(func);
};

/** Get the current view location.
 *
 *  Returns an object containing:
 *  x: the x coordinate currently in the center of the screen, in tile 0 size units.
 *  y: the corresponding y coordinate.
 *  scale: the viewport width, in "tile 0" units.
 */
CanvasTilesRenderer.prototype.getLocation = function() {
  var left = this.pinchZoom.worldPosFromViewerPos({x: 0, y:this.canvas.height / 2});
  var right = this.pinchZoom.worldPosFromViewerPos({x: this.canvas.width, y:this.canvas.height / 2});
  
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    scale: Utils.distance(right, left)
  };
};

/** Set the current location.
 *
 * \param location the location in the format returned by getLocation().
 */
CanvasTilesRenderer.prototype.setLocation = function(location) {
  if (isNaN(location.x) || isNaN(location.y) || isNaN(location.scale)) {
    throw(new Error('invalid location'));
  }
  var canvas = this.canvas;
  var ratio = [
    location['vx'] || .5,
    location['vy'] || .5,
  ];
  var x_pos = canvas.width * ratio[0];
  var y_pos = canvas.height * ratio[1];
  var constraints = [
    { viewer: {x: x_pos - canvas.width / 2, y: y_pos}, world: {x:location.x - location.scale /2, y: location.y} },
    { viewer: {x: x_pos + canvas.width / 2, y: y_pos}, world: {x:location.x + location.scale /2, y: location.y} },
  ];
  this.location = location;
  this.pinchZoom.processConstraints(constraints);  
};

/** Refresh the canvas.
 *
 * this method has to be called if the canvas element is resized.
 * calling refresh mutliple times in a raw only causes 1 refresh to occur.
 */
CanvasTilesRenderer.prototype.refresh = function() {
  var t = this;
  if (t.lastRefreshRequest == t.numDraw) {
    return;
  }
  t.lastRefreshRequest = t.numDraw;

  window.requestAnimationFrame(function() { t.draw(t.canvas); });
};

CanvasTilesRenderer.prototype.resizeCanvas = function(width, height) {
  if (this.disableResize) {
    return;
  }

  var canvas = this.canvas;

  // devicePixelRatio should tell us about the current zoom level.
  var density = (this.params.forceDevicePixelRatio || window.devicePixelRatio || 1);

  // On some browsers/devices, filling the full resolution canvas
  // takes too long. During animations, we downsample the canvas
  // to make it fast enough. When motion stops, we render the map
  // at full resolution again.
  var factor = (this.params.downsampleDuringMotion &&
                this.pinchZoom.isMoving()) ?  density / 2 : density;

  var initialClientWidth = canvas.clientWidth;
  var initialClientHeight = canvas.clientHeight;

  // Is it Math.floor or Math.round ? Who knows...
  var newWidth = width || Math.floor(canvas.clientWidth * factor);
  var newHeight = height || Math.floor(canvas.clientHeight * factor);

  if (newWidth != 0 && newHeight != 0 && 
         (Math.abs(canvas.width - newWidth) > 3 ||
          Math.abs(canvas.height - newHeight) > 3)) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      this.pixelRatio = factor;
  }

  if (canvas.width != this.canvasWidth || canvas.height != this.canvasHeight) {
      this.canvasWidth = canvas.width;
      this.canvasHeight = canvas.height;

      // We resized the canvas, but we want to express the same transform.
      // Let's update the transform for the new size.
      this.setLocation(this.location);
  }  
  
  if (width == undefined && height == undefined
      && (initialClientWidth != canvas.clientWidth
          || initialClientHeight != canvas.clientHeight)) {
     // Canvas size on page should be set by CSS, not by canvas.width and canvas.height.
     // It seems it is not the case. Let's forget about this devicePixelRatio stuff.
     this.disableResize = true;  
     this.debug('Disabling resize :(');
  }  
};

CanvasTilesRenderer.prototype.draw = function() {
  if (this.inDraw) {
    return;
  }
  this.inDraw = true;

  var startTimestamp = new Date().getTime();

  var canvas = this.canvas;
  var pinchZoom = this.pinchZoom;
  
  this.resizeCanvas();
  pinchZoom.checkAndApplyTransform();
  
  // Compute a bounding box of the viewer area in world coordinates.
  var cornersPix = [
    {x: 0, y: 0},
    {x: canvas.width, y: 0},
    {x: canvas.width, y: canvas.height},
    {x: 0, y: canvas.height},
  ];
  var cornersWorld = [];
  for (var i = 0; i < 4; ++i) {
    cornersWorld.push(pinchZoom.worldPosFromViewerPos(cornersPix[i]));
  }
  var bboxTopLeft = cornersWorld.reduce(
    function(a,b) { return {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y)}; },
    cornersWorld[0]);
    
  var bboxBottomRight = cornersWorld.reduce(
    function(a,b) { return {x: Math.max(a.x, b.x), y: Math.max(a.y, b.y)}; },
    cornersWorld[0]);
    
  // Clear the canvas
  var context = canvas.getContext('2d');

  for (var i in this.layers) {
    this.layers[i].draw(canvas, pinchZoom, bboxTopLeft, bboxBottomRight);
  }
  //this.clearBorder(context);



  // Rendering resolution is decreased during motion.
  // To render high-res after a motion, we detect motion end
  // by setting and postponing a timeout during motion.
  var moving = this.pinchZoom.isMoving();
  if (moving) {
    if (this.moveEndTimeout != undefined) {
      window.clearTimeout(this.moveEndTimeout);
    }
    var t = this;
    this.moveEndTimeout = setTimeout(function() {
      t.moveEndTimeout = undefined;
      t.refresh();
    }, 100);
  }
  
  this.inDraw = false;
  ++this.numDraw;

  var endTimestamp = new Date().getTime();
  var renderingTime = (endTimestamp - startTimestamp);
  if (renderingTime > (1000/this.params.downgradeIfSlowerFPS)) {
      // If rendering is too slow, we degrade visual quality during motion,
      // to make it faster.
      this.params.downsampleDuringMotion = true;
  }

  if (this.params.debug) {
    var debugLocation = this.getLocation();
    this.debug('Draw at '
               + debugLocation.x + ', ' + debugLocation.y +' scale: ' + debugLocation.scale
               + ' rendering time:' + renderingTime
               + ' w:' + canvas.width + ' h:' + canvas.height);
  }
};


CanvasTilesRenderer.prototype.clearBorder = function(context) {
  var canvas = this.canvas;

  var topLeft = this.pinchZoom.viewerPosFromWorldPos(this.pinchZoom.topLeftWorld());
  var bottomRight = this.pinchZoom.viewerPosFromWorldPos(
      this.pinchZoom.bottomRightWorld());

  context.fillStyle = 'white';
  if (topLeft.x > 0) {
    context.fillRect(0, 0, Math.floor(topLeft.x), canvas.height);
  }

  if (topLeft.y > 0) {
    context.fillRect(0, 0, canvas.width, Math.floor(topLeft.y));
  }

  if (bottomRight.x < canvas.width) {
    context.fillRect(bottomRight.x, 0,
                      canvas.width - bottomRight.x, canvas.height);
  }
  if (bottomRight.y < canvas.height) {
    context.fillRect(0, bottomRight.y,
                      canvas.width, canvas.height - bottomRight.y);
  }
};

CanvasTilesRenderer.prototype.refreshIfNotMoving = function() {
  if (!this.pinchZoom.isMoving()) {
    this.refresh();
  }
}

// loadImage might be overloaded when rendering outside of a browser,
// for example with node-canvas.
CanvasTilesRenderer.prototype.loadImage = function(url, success, failure) {
  var image = new Image();
  image.src = url;
  image.onload = function() {
    success(image);
  };
  if (failure) {
    image.onerror = function(err) {
      failure(err);
    };
  }
};

window.addEventListener("load", function load(event){
  //remove listener, no longer needed
  window.removeEventListener("load", load, false);
  MapHtmlInterface.init();
},false);

var MapHtmlInterface = {
  paramNames: ["url", "width", "height", "debug", "minScale", "tileSize",
               "maxNumCachedTiles", "maxSimultaneousLoads", "downgradeIfSlowerFPS",
               "initialLocation", "onLocationChange", "geoConv", "maxScale",
               "maxX", "maxY", "minY", "minX", "onInitialized", "fillScreen"],
  stringParamNames: {"url": true},

  init: function() {
    var maps = document.querySelectorAll("[data-map-url]");
    for (var i = 0; i < maps.length; ++i) {
      MapHtmlInterface.initMap(maps[i]);
    }
  },

  initMap: function(container) {
    var canvas = container.getElementsByTagName('canvas')[0];
    if (!canvas) {
      canvas = document.createElement('canvas');
      container.insertBefore(canvas, container.childNodes[0]);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
    canvas.innerHtml = "Your browser does not support CANVAS.";

    var params = {
      canvas: canvas,
      geoConv: function(lon,lat) {
	  // default to OSM converter.
	  return [
	      ((lon + 180.0) / 360.0),
	      ((1.0 - Math.log( Math.tan(lat * Math.PI/180.0) + 1.0 / Math.cos(lat * Math.PI/180.0)) / Math.PI) / 2.0)
	  ];
      }
    }
    var attr = function(name) {
      var attributeName = "data-map-" + name;
      if (container.hasAttribute(attributeName)) {
        params[name] = container.getAttribute(attributeName);
        if (!(name in MapHtmlInterface.stringParamNames)) {
           eval("params[name] = (" + params[name] + ');');
        }
      }
    }
    for (var i in MapHtmlInterface.paramNames) {
      attr(MapHtmlInterface.paramNames[i]);
    }
    if (typeof(params.onLocationChange) == "function") {
      var userCallback = params.onLocationChange;
      params.onLocationChange = function(canvasRenderer) {
        MapHtmlInterface.placeMarks(container, canvasRenderer);
        userCallback(canvasRenderer);
      }
    } else {
      params.onLocationChange = function(canvasRenderer) {
        MapHtmlInterface.placeMarks(container, canvasRenderer);
      }
    }
    var canvasTilesRenderer = new CanvasTilesRenderer(params);

    canvasTilesRenderer.refreshHtmlElements = function() {
        MapHtmlInterface.placeMarks(this.container, this);
    };

    canvasTilesRenderer.resizeListener = function() {
      canvasTilesRenderer.refresh();
    };

    window.addEventListener(
        "resize", canvasTilesRenderer.resizeListener, false);

    canvasTilesRenderer.container = container;

    if (params.onInitialized) {
      params.onInitialized(canvasTilesRenderer);
    }
    return canvasTilesRenderer;
  },

  destroy: function(renderer) {
    window.removeEventListener("resize", renderer.resizeListener);
    renderer.container.removeChild(renderer.params.canvas);
    for (var i in renderer) {
      delete renderer[i];
    }
  },

  placeMarks: function(container, canvasTilesRenderer) {
    if (!canvasTilesRenderer) {
      canvasTilesRenderer = container.canvasTilesRenderer;
    }
    var worldToElement = function(x, y) {
      var canvas = canvasTilesRenderer.params.canvas;
      var canvasPos = canvasTilesRenderer.pinchZoom.viewerPosFromWorldPos(x, y);
      return {
        x: canvasPos.x * (canvas.offsetWidth / canvas.width),
        y: canvasPos.y * (canvas.offsetHeight / canvas.height)
      };
    }

    var splitArrayArg = function(asString) {
      if (asString) {
        return asString.split(",").map(parseFloat);
      } else {
        return [];
      }
    }

    var processFloatAttribute = function (elem, attrName, callback) {
      var name = "data-map-" + attrName;
      if (elem.hasAttribute(name)) {
          callback(parseFloat(elem.getAttribute(name)));
        }
    };

    var loc = canvasTilesRenderer.getLocation();

    for (var i = 0; i < container.childNodes.length; ++i) {
      var child = container.childNodes[i];
      if ("hasAttribute" in child && (
		  child.hasAttribute("data-map-pos")
		  || child.hasAttribute("data-map-geo"))) {
	if (child.hasAttribute("data-map-pos")) {
	    var pos = splitArrayArg(child.getAttribute("data-map-pos"));
	} else {
	    var geopos = splitArrayArg(child.getAttribute("data-map-geo"));
	    var pos = canvasTilesRenderer.params.geoConv(geopos[0], geopos[1]);
	}

        if (pos.length != 2) {
          throw("data-map-pos syntax is: \"x,y\", for example: data-map-pos=\".1,.2\"");
        }
        var worldPos = { x: pos[0], y: pos[1] };
        var anchorPos = worldToElement(worldPos);

        var anchor = { x: 0, y: 0 };
        var anchorParam = splitArrayArg(child.getAttribute("data-map-anchor"));
        if (!isNaN(anchorParam[0])) {
          anchor.x = anchorParam[0];
        }
        if (!isNaN(anchorParam[1])) {
          anchor.y = anchorParam[1];
        }

        var topLeft = {
          x: anchorPos.x - anchor.x * child.offsetWidth,
          y: anchorPos.y - anchor.y * child.offsetHeight
        };

        child.style.position = "absolute";
        child.style.left = Math.round(topLeft.x) + "px";
        child.style.top = Math.round(topLeft.y) + "px";

        processFloatAttribute(child, "width", function(width) {
          var topRight = worldToElement(worldPos.x + width, worldPos.y);
          child.style.width = (topRight.x - topLeft.x) + "px";
        });

        processFloatAttribute(child, "height", function(height) {
          var bottomLeft = worldToElement(worldPos.x, worldPos.y + height);
          child.style.height = (bottomLeft.y - topLeft.y) + "px";
        });

        var display = undefined;
        processFloatAttribute(child, "min-scale", function(minScale) {
          if (loc.scale < minScale) {
            display = "none";
          }
        });
        processFloatAttribute(child, "max-scale", function(maxScale) {
          if (loc.scale > maxScale) {
            display = "none";
          }
        });
        child.style.display = display;
      }
    }
  },
  getRenderer: function(element) {
    return element.canvasTilesRenderer;
  }
};
function TileLayer(params, renderer) {
  this.params = params;

  this.renderer = renderer;

  this.tiles = {};
  this.numLoading = 0;
  this.loadQueue = [];
  this.numDraw = 0;
  this.numCachedTiles = 0;

  if (!("tileSize" in this.params)) this.params.tileSize = 256;
  if (!("url" in this.params)) {
    this.params.url = function(scale, x, y) {
      return "http://a.tile.openstreetmap.org/" + scale + '/' + x + '/' + y + '.png';
    };
  }
  if (params.debug) {
      this.debug = function(msg) { console.log(msg); }
  } else {
      this.debug = function(msg) { };
  }
  if (!this.params.maxNumCachedTiles) this.params.maxNumCachedTiles = 64;
  if (!this.params.maxSimultaneousLoads) this.params.maxSimultaneousLoads = 3;

  this.maxUpLevels = this.params.maxUpLevels || 5;

}

TileLayer.prototype.tileSizeOnCanvas = function(canvas) {
  var density = (this.params.forceDevicePixelRatio || window.devicePixelRatio || 1);
  return this.params.tileSize * density;
}

TileLayer.prototype.draw = function(canvas, pinchZoom,
                                    bboxTopLeft, bboxBottomRight) {

  // Compute the scale level
  var numTiles = canvas.width / this.tileSizeOnCanvas();
  var targetUnitPerTile = (bboxBottomRight.x - bboxTopLeft.x) / numTiles;
  var scale = Math.max(0, Math.ceil(- Math.log(targetUnitPerTile) / Math.LN2));

  // Are we in downsampled mode? if yes, artificially push to the next scale level.
  if (canvas.canvasTilesRenderer.params.downsampleDuringMotion
      && pinchZoom.isMoving()) {
    scale += 1;
  }

  var actualUnitPerTile = 1 / (1 << scale);

  var getTileX = function(unitX) { return  Math.floor(unitX * (1 << scale)); };
  var getTileY = function(unitY) { return  getTileX(unitY); };
  
  var firstTileX = getTileX(Math.max(0, bboxTopLeft.x));
  var firstTileY = getTileY(Math.max(0, bboxTopLeft.y));
  var lastTileX = getTileX(Math.min(this.params.width, bboxBottomRight.x));
  var lastTileY = getTileY(Math.min(this.params.height, bboxBottomRight.y));

  Utils.assert(firstTileY != undefined);

  var zoom = 1.0 / (1 << scale);
  var tileGeometry = {
    origin: pinchZoom.viewerPosFromWorldPos(firstTileX * zoom,
                                            firstTileY * zoom),
    delta: pinchZoom.viewerPosFromWorldPos((firstTileX + 1) * zoom,
                                           (firstTileY + 1) * zoom),
    firstTileX: firstTileX,
    firstTileY: firstTileY
  };
  // We address canvas pixels in integer coordinates to avoid
  // inconsistencies across browsers.
  tileGeometry.delta.x = Math.round(tileGeometry.delta.x - tileGeometry.origin.x);
  tileGeometry.delta.y = Math.round(tileGeometry.delta.y - tileGeometry.origin.y);
  tileGeometry.origin.x = Math.round(tileGeometry.origin.x);
  tileGeometry.origin.y = Math.round(tileGeometry.origin.y);

  var context = canvas.getContext('2d');

  for (var tileY = firstTileY; tileY <= lastTileY; ++tileY) {
    for (var tileX = firstTileX; tileX <= lastTileX; ++tileX) {
      this.renderTile(scale, tileX, tileY, context, tileGeometry, canvas);
    }
  }

  this.processQueue();

  // control memory usage.
  this.limitCacheSize();

  this.numDraw++;
}

TileLayer.prototype.renderTile = function(scale, tileX, tileY, context, tileGeometry, canvas) {
  var left = tileGeometry.origin.x
      + tileGeometry.delta.x * (tileX - tileGeometry.firstTileX);
  var top = tileGeometry.origin.y
      + tileGeometry.delta.y * (tileY - tileGeometry.firstTileY);

  if (left >= canvas.width || top >= canvas.height) {
    return;
  }

  for (var upLevel = 0; upLevel <= scale && upLevel < this.maxUpLevels; ++upLevel) {
    var upTileX = tileX >> upLevel;
    var upTileY = tileY >> upLevel;
    
    var tile = this.getTile(scale - upLevel, upTileX , upTileY, 1 - upLevel * .15);
    if (tile && tile.image && tile.image.complete && tile.image.width > 0 && tile.image.height > 0) {
      var skipX = tileX - (upTileX << upLevel);
      var skipY = tileY - (upTileY << upLevel);
      var size = this.params.tileSize >> upLevel;
      
      var texCoordX = skipX * size;
      var texCoordY = skipY * size;
      var texWidth = Math.min(size, tile.image.width - skipX * size);
      var texHeight = Math.min(size, tile.image.height - skipY * size);
      
      var width = tileGeometry.delta.x * (texWidth / size);
      var height = tileGeometry.delta.y * (texHeight / size);
      
      try {
          context.drawImage(tile.image,
            texCoordX, texCoordY, texWidth, texHeight,
            left, top, width, height);
      } catch (e) {
          console.log('drawImage failed: ' + e.message);
      }
      return;
    }
  }
};

TileLayer.prototype.tileKey = function(scale, x, y) {
  if (typeof(scale) == 'object') {
    var p = scale;
    scale = p.scale;
    x = p.x;
    y = p.y;
  }
  return  scale + "," + x + "," + y;
}

TileLayer.prototype.getTile = function(scale, x, y, priority) {
  var key = this.tileKey(scale, x, y);
  
  if (key in this.tiles) {
    var tile = this.tiles[key];
    if (tile.lastDrawRequest == this.numDraw) {
      tile.priority += priority;
    } else {
      tile.lastDrawRequest = this.numDraw;
      tile.priority = priority;
    }
    return tile;
  }
  
  if (typeof(this.params.url) == "function") {
    var url = this.params.url(scale, x, y);
  } else {
    var url = this.params.url
      .replace("$x", '' + x)
      .replace("$y", '' + y)
      .replace("$scale", '' + scale);
  }
  return this.queueTileRequest(key, url, priority);
};

TileLayer.prototype.queueTileRequest = function(key, url, priority) {
  var tile = { lastDrawRequest: this.numDraw, priority: priority, state: "queue" };
  Utils.assert(tile.priority != undefined);
  this.loadQueue.push({key: key, url: url, tile: tile});
  this.tiles[key] = tile;
  return tile;
};

TileLayer.prototype.processQueue = function() {
  var queue = this.loadQueue;
  
  // Prioritize loading
  if (this.numLoading < this.params.maxSimultaneousLoads && queue.length > 0) {
    this.loadQueue.sort(function(a, b) {
      if (a.tile.lastDrawRequest == b.tile.lastDrawRequest) {
        return a.tile.priority - b.tile.priority;
      }
      return a.tile.lastDrawRequest - b.tile.lastDrawRequest;
    });
  }
  while (this.numLoading < this.params.maxSimultaneousLoads && queue.length > 0) {  
    var query = this.loadQueue.pop();
    
    // Check if the tile is still required.
    if ((this.numDraw - query.tile.lastDrawRequest) < 3) {
      this.numLoading++;
        
      query.tile.state = "loading";

      // Force the creation of a new scope to make sure
      // a new closure is created for every "query" object. 
      var f = (function(t, query) {
        t.renderer.loadImage(query.url,
          function(image) {
            t.numLoading--;
            t.numCachedTiles++;
            query.tile.state = "loaded";
            query.tile.image = image;
            t.renderer.refreshIfNotMoving();
          },
          function(error) {
            console.log('Failed to load image: ' + query.url + ': ' + error);
            t.numLoading--;
            query.tile.state = "failed";
            t.processQueue();
          });
      })(this, query);


    } else {
      // There's no need to load this tile, it is not required anymore.
      delete this.tiles[query.key];
    }
  }
};

TileLayer.prototype.limitCacheSize = function() {
  if (this.numCachedTiles <= this.params.maxNumCachedTiles) {
    // The cache is small enough.
    return;
  }

  // Build an array of tiles we may need to remove from cache  
  var cache = [];
  for (var key in this.tiles) {
    var tile = this.tiles[key];
    // We do not remove tiles that are currently displayed.
    if (tile.image && tile.lastDrawRequest != this.numDraw) {
      cache.push(key);
    }
  }
  
  // Sort it: oldest request first.
  var t = this;  
  cache.sort(function(a,b) { return t.tiles[a].lastDrawRequest - t.tiles[b].lastDrawRequest; });
  
  // Remove old tiles.
  var numToRemove = cache.length - this.params.maxNumCachedTiles;
  for (var i = 0; i < numToRemove; ++i) {
    var key = cache[i];
    delete this.tiles[key];
    this.numCachedTiles--;
  }
};

TileLayer.prototype.maxZoomAt = function(p) {
  var maxScale = undefined;
  var firstFailed

  var me = this;
  var stateAtScale = function(scale) {
    var key = me.tileKey(Utils.worldToTile(scale, p));
    if (key in me.tiles) {
      return me.tiles[key].state;
    }
    return undefined;
  };

  var lastTileWithState = function(state) {
    for (var i = 20; i >= 0; --i) {
      if (stateAtScale(i) == state) {
        return i;
      }
    }
    return undefined;
  };

  var lastAvailable = lastTileWithState('loaded');
  if (lastAvailable != undefined) {
    if (stateAtScale(lastAvailable + 1) == 'failed') {
      return lastAvailable;
    }
  }

  return undefined;
};

TileLayer.prototype.minScaleAt = function(canvas, p) {
  var maxZoomLevel = this.maxZoomAt(p);
  if (maxZoomLevel == undefined) {
    return undefined;
  }

  var numTiles = canvas.width / this.tileSizeOnCanvas(canvas);
  var minScale = .5 * numTiles / (1 << maxZoomLevel);

  return minScale;
};

function ScaleLayer(params, renderer) {
  this.renderer = renderer;
  this.params = params || {};
  this.sizeRatio = this.params.sizeRatio || .3;
  this.margin = this.params.margin || 15;

  this.verticalPlacement = params.verticalPlacement || 'top';
  this.horizontalPlacement = params.horizontalPlacement || 'right';
  this.shadowColor = params.shadowColor || 'rgba(255,255,255,.8)';
  this.scaleColor = params.scaleColor || '#000000';
}

function nice(x) {
  var r = Math.pow(10, Math.floor(Math.log10(x))) / 2;
  return Math.round(x / r) * r;
}

function formatScale(km) {
  if (km <= 1) {
    return '~ ' + (km * 1000).toFixed(0) + ' m';
  } else {
    return '~ ' + km.toFixed(0) + ' km';
  }
}

ScaleLayer.prototype.draw = function(canvas, pinchZoom,
                                     bboxTopLeft, bboxBottomRight) {

  var latLon = Utils.worldToLatLon(
      pinchZoom.worldPosFromViewerPos({x: canvas.width/2, y: canvas.height/2}));

  var earthCircumference = 40075.017; // in km
  var xToKm = earthCircumference * Math.cos(latLon.lat * Math.PI / 180);
  var scaleWorld =
    Math.min(pinchZoom.bottomRightWorld().x, bboxBottomRight.x)
    - Math.max(pinchZoom.topLeftWorld().x, bboxTopLeft.x);

  var scaleKm = nice(scaleWorld / 4 * xToKm);

  if (this.params.maxDist && scaleKm > this.params.maxDist) {
    // for very large distances, it does not really make sense
    // to have a linear scale: the mercator projection distorts too much.
    return;
  }

  var pixelRatio = this.renderer.pixelRatio;

  var margin = this.margin * pixelRatio;

  var topLeftViewer =
    pinchZoom.viewerPosFromWorldPos(pinchZoom.topLeftWorld());
  var bottomRightViewer =
    pinchZoom.viewerPosFromWorldPos(pinchZoom.bottomRightWorld());

  var startViewer = {
    x: (this.horizontalPlacement == 'right' ?
        Math.min(canvas.width, bottomRightViewer.x) - margin
        : Math.max(0, topLeftViewer.x) + margin),
    y: (this.verticalPlacement == 'top' ?
        Math.max(topLeftViewer.y, 0) + margin
        : Math.min(bottomRightViewer.y, canvas.height) - margin)
  };

  var startWorld = pinchZoom.worldPosFromViewerPos(startViewer);
  var endWorld = {
    x: startWorld.x + scaleKm / xToKm * (this.horizontalPlacement == 'right' ? -1 : 1),
    y: startWorld.y
  };
  var endViewer = pinchZoom.viewerPosFromWorldPos(endWorld);
  endViewer.x = Math.round(endViewer.x);
  endViewer.y = Math.round(endViewer.y);

  if (endViewer.x > canvas.width || endViewer.x <= margin) {
    // oops.. the screen is too thin.
    return;
  }

  var context = canvas.getContext('2d');

  var dy = 4 * pixelRatio;

  for (var pass = 0; pass < 2; ++pass) {
    context.strokeStyle = (pass == 0 ? this.shadowColor : this.scaleColor);
    context.lineWidth = (pass == 0 ? 3 : 1) * pixelRatio;

    context.beginPath();
    context.moveTo(startViewer.x, startViewer.y);
    context.lineTo(endViewer.x, endViewer.y);

    context.moveTo(startViewer.x, startViewer.y - dy);
    context.lineTo(startViewer.x, startViewer.y + dy);

    context.moveTo(endViewer.x, endViewer.y - dy);
    context.lineTo(endViewer.x, endViewer.y + dy);

    context.stroke();
  }

  context.textAlign = (this.horizontalPlacement == 'right' ? 'end' : 'start');
  context.textBaseline = (this.verticalPlacement == 'top' ? 'top' : 'bottom');

  var fontSize = 12;
  context.font = (fontSize * this.renderer.pixelRatio) + 'px '
      + 'Roboto, "Helvetica Neue", HelveticaNeue, "Helvetica-Neue", Helvetica, Arial, "Lucida Grande", sans-serif';
  var text = formatScale(scaleKm);
  var textX = startViewer.x + dy * (this.horizontalPlacement == 'right' ? -1 : 1);
  var textY = startViewer.y;

  context.strokeStyle = this.shadowColor;
  context.lineWidth = 3 * this.renderer.pixelRatio;
  context.strokeText(text, textX, textY);

  context.fillStyle = this.scaleColor;
  context.fillText(text, textX, textY);
};
