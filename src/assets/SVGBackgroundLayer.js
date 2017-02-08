'use strict';


function SVGBackgroundLayer(params) {
  this.params = params;
  this.renderer = params.renderer;
  this.image = undefined;

  if (!this.renderer) {
    throw(new Error("SVGBackgroundLayer: no renderer !"));
  }
  params.imageUrl = params.imageUrl || 'worldHigh.svg';

  var me = this;
  this.renderer.loadImage(
      params.imageUrl,
      function(imageData) {
        me.image = imageData;
        me.renderer.refresh();
      },
      function(err) {
        throw new Error(err);
      }
  );

  this.leftLongitude = params.leftLongitude || -169.110266;
  this.topLatitude = params.topLatitude || 83.63001;
  this.rightLongitude = params.rightLongitude || 190.480712;
  this.bottomLatitude = params.bottomLatitude || -58.488473;
}

SVGBackgroundLayer.prototype.draw = function(canvas, pinchZoom,
                                      bboxTopLeft, bboxBottomRight) {
  if (!this.image) {
    return;
  }
  var context = canvas.getContext('2d');
  context.rect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#a0d2ff';
  context.fill();

  var topLeftWorld = Utils.latLonToWorld(
      [this.leftLongitude, this.topLatitude])

  var topleft = pinchZoom.viewerPosFromWorldPos(topLeftWorld);

  var bottomRightWorld = Utils.latLonToWorld(
      [this.rightLongitude, this.bottomLatitude])
  //bottomRightWorld.x += 1;
  var bottomright = pinchZoom.viewerPosFromWorldPos(bottomRightWorld);

  var tx = topleft.x;
  var ty = topleft.y;
  var sx = (bottomright.x - topleft.x) / 1009.6727;
  var sy = (bottomright.y - topleft.y) / 665.96301;

  var parseCoord = function(c) {
    var a = c.split(',');
    return [ parseFloat(a[0]), parseFloat(a[1]) ];
  }


  for (var i in countries) {
    var country = countries[i];
    var coords = country.d.split(' ');

    var p = parseCoord(coords[1]);
    context.moveTo(p[0], p[1]);

    for (var j = 2; j < coords.length - 1; ++j) {
      var delta = praseCoord(coords[j]);
      p[0] += delta[0];
      p[1] += delta[1];
      context.lineTo(p[0], p[1]);
    }
    context.closePath();
    context.fillStyle = '#eeeeee';
    context.fill();

  }

};

