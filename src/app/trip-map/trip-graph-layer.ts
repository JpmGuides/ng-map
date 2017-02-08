import { TripGraph } from './trip-graph';
import { TripEdge } from './trip-edge';
import { TripNode, TripNodeProperties } from './trip-node';
import { BoundingBox } from './bounding-box';
import { Size2D } from './size2d';
import { TripSaved } from './trip-saved';
import { Point, IPoint } from './point';

declare var d3 : any;
declare var Bezier : any;

export interface Location {
  x: Number,
  y: Number,
  scale: Number
}

export interface CanvasTilesRendererParams {
  url: String;
  initialLocation: Location;
  canvas: HTMLCanvasElement;
}

export interface Layer {
}

declare class CanvasTilesRenderer {
  constructor (parameters: CanvasTilesRendererParams);
  pixelRatio : number;
  layers : any[];
  pinchZoom: PinchZoom;
  canvas: HTMLCanvasElement;
  location: Location;

  addLayer(l : any);
  refresh();
  refreshIfNotMoving();

  setLocation(loc : Location);
  loadImage(url : string,
            success: (data : any) => void,
            failure: (err : string) => void);
}

declare class PinchZoom {
  touchEventHandlers : any[];

  viewerPosFromWorldPos(x : IPoint | number[] | number, y? : number) : Point;
  worldPosFromViewerPos(x : IPoint | number[] | number, y? : number) : Point;
}


export interface TripGraphLayerParams {
  renderer: CanvasTilesRenderer;
  graph: TripGraph;
  defaultRadius? : number;
  defaultFontSize? : number;
};

export class TripGraphLayer {
  public graph: TripGraph;
  private renderer: CanvasTilesRenderer;
  private defaultRadius : number;
  private icons : any;
  private defaultTextProp : {
    fontSize : number;
    stroke: string;
    fill: string;
  };

  private iconsToLoad : number;
  private failedIcons : number;

  constructor(private params : TripGraphLayerParams) {
    this.renderer = params.renderer;
    this.defaultRadius = params.defaultRadius || 6;
    this.icons = {};
    this.defaultTextProp = {
      fontSize: params.defaultFontSize || 20,
      stroke: 'rgba(255,255,255,.8)',
      fill: '#000000'
    };

    if (!this.renderer) {
      throw(new Error("TripGraphLayer: no renderer !"));
    }
    this.graph = params.graph || new TripGraph();
  }

  draw(canvas: any, pinchZoom: any, bboxTopLeft: any, bboxBottomRight: any) {
    let graph = this.graph;
    let me = this;
    let context = canvas.getContext('2d');
    let pixelRatio = this.renderer.pixelRatio;

    graph.edges.forEach(function(edge) {
      me.setEdgeStrokeStyle(context, edge);

      var bezierCurves = graph.bezier(edge);
      for (var i in bezierCurves ) {
        var bezier = bezierCurves[i];
        TripGraphLayer.drawBezier(context, pinchZoom, bezier, pixelRatio);
      }
      if (bezierCurves.length > 1 && edge.drawMiddlePoint) {
        for (var i in bezierCurves) {
          var p = pinchZoom.viewerPosFromWorldPos(bezierCurves[i].points[3]);
          var radius = 5 * pixelRatio;
          context.beginPath();
          context.arc(p.x, p.y, radius, 0, 2 * Math.PI, false);
          context.fillStype = '#000000';
          context.fill();
        }
      }
    });


    for (var i in graph.nodes) {
      var node = graph.nodes[i];
      node.viewerPos = pinchZoom.viewerPosFromWorldPos(node.coord);
    }

    for (var i in graph.nodes) {
      this.drawNodePoint(context, pinchZoom, graph.nodes[i]);
    }
    for (var i in graph.nodes) {
      this.drawLeaderLine(context, pinchZoom, graph.nodes[i]);
    }
    for (var i in graph.nodes) {
      this.drawNodeLabel(context, pinchZoom, graph.nodes[i]);
    }
  }

  static drawBezier(context: CanvasRenderingContext2D, pinchZoom : any,
                    curve : any, pixelRatio : number) {

    var ptArray = new Array(8);
    var points = curve.points;
    for (var j = 0; j < 4; ++j) {
      let p = pinchZoom.viewerPosFromWorldPos(points[j]);
      ptArray[j * 2] = p.x;
      ptArray[j * 2 + 1] = p.y;
    }

    var bezier = new Bezier(ptArray);
    var l = bezier.length();
    var numArrows = Math.min(2, Math.floor(l / (pixelRatio * 30)));
    var size = 10 * pixelRatio;

    for (var i = 1; i < numArrows; ++i) {
      let t = i / numArrows;
      let p = bezier.get(t);
      let n = bezier.normal(t);
      let tangent = new Point(bezier.derivative(t));
      tangent.mul(size / tangent.norm());
      p = Point.plus(p, Point.times(.5, tangent));
      var base = Point.minus(p, tangent);

      context.beginPath();
      context.moveTo(base.x + (size/2) * n.x, base.y + (size/2) * n.y);
      context.lineTo(p.x, p.y);
      context.lineTo(base.x - (size/2) * n.x, base.y - (size/2) * n.y);
      context.closePath();
      context.fill();
    }

    var viewcurve = bezier.points;

    context.beginPath();
    context.moveTo(viewcurve[0].x, viewcurve[0].y);
    context.bezierCurveTo(
        viewcurve[1].x, viewcurve[1].y,
        viewcurve[2].x, viewcurve[2].y,
        viewcurve[3].x, viewcurve[3].y);

    context.stroke();
  }

  setEdgeStrokeStyle(context : CanvasRenderingContext2D, edge : TripEdge) {
    var style = edge.lineColor || '#003300';
    context.strokeStyle = style;
    context.fillStyle = style;
    context.lineWidth = this.renderer.pixelRatio * (edge.lineWidth || 2);
  };

  nodeRadius(node : TripNode) : number {
    var r = this.defaultRadius;
    if (node.properties && node.properties.radius) {
      r = node.properties.radius;
    }
    return r * this.renderer.pixelRatio;
  };

  drawNodePoint(context : CanvasRenderingContext2D, pinchZoom : any, node : TripNode) {
    if (node.properties && node.properties.point == false) {
      return;
    }
    var pos = node.viewerPos;
    this.drawPoint(context, pos, this.renderer.pixelRatio, node.properties || {});
  }

  drawNodeLabel(context: CanvasRenderingContext2D, pinchZoom: any, node: TripNode) {
    if (node.label || node.labelIcon) {
      if (node.properties && node.properties.labelCoord) {
        var labelPoint = pinchZoom.viewerPosFromWorldPos(node.properties.labelCoord);
      }
      var pos = labelPoint || pinchZoom.viewerPosFromWorldPos(node.coord);
      if (node.label) {
        TripGraphLayer.drawText(context, node.label, pos,
                 this.renderer.pixelRatio, node.properties || {},
                 this.defaultTextProp);
      }
      if (node.labelIcon && node.labelIcon.url in this.icons) {
        if (node.labelIcon.autorotate != undefined) {
          let coord = new Point(node.coord);
          node.labelIcon.angle = node.labelIcon.autorotate + Math.atan2(
              coord.y - node.properties.labelCoord.y,
              coord.x - node.properties.labelCoord.x);
        }
        TripGraphLayer.drawIcon(context, this.icons[node.labelIcon.url], node.labelIcon,
                 pos, this.renderer.pixelRatio);
      }
      if (node.properties && node.properties.frame && node.label) {
        var size = TripGraphLayer.measureText(
            context, node.label,
            this.renderer.pixelRatio, node.properties || {},
            this.defaultTextProp);
        context.strokeStyle = node.properties.frame;
        size.width += 3 * this.renderer.pixelRatio;
        size.height += 3 * this.renderer.pixelRatio;
        context.rect(pos.x - size.width / 2,
                     pos.y - size.height / 2,
                     size.width, size.height);
        context.stroke();
      }
    }
  }

  drawLeaderLine(context: CanvasRenderingContext2D, pinchZoom: any, node: TripNode) {
    if (node.properties && node.properties.leaderLineAnchor) {
      var pixelRatio = this.renderer.pixelRatio;
      var p = pinchZoom.viewerPosFromWorldPos(node.properties.leaderLineAnchor);
      context.lineWidth = (node.properties.leaderLineWidth || 1) * pixelRatio;
      context.beginPath();

      var pos = pinchZoom.viewerPosFromWorldPos(node.coord);
      var radius = this.nodeRadius(node);
      var closest = pinchZoom.viewerPosFromWorldPos(
          BoundingBox.closestPoint(new Point(node.coord), node.properties.labelBbox));

      if (Point.dist(closest, pos) > (3*radius)) {
        if (node.properties.dashed) {
          var scaled = [];
          for (var i in node.properties.dashed) {
            scaled.push(this.renderer.pixelRatio * node.properties.dashed[i]);
          }
          context.setLineDash(scaled);
        }

        context.moveTo(p.x, p.y);
        context.lineTo(pos.x, pos.y);
        context.strokeStyle = node.properties.leaderLineColor || '#000000';
        context.stroke();
        if (node.properties.dashed) {
          context.setLineDash([]);
        }
      }
    }
  };

  drawPoint(context : CanvasRenderingContext2D, p : IPoint, pixelRatio: number, properties: TripNodeProperties) {
      context.strokeStyle = "rgba(0,0,0,1)";
      context.fillStyle = "rgba(255,255,255,1)";
      context.lineWidth = 2 * pixelRatio;
      context.beginPath();
      context.arc(p.x, p.y, (properties.radius || this.defaultRadius) * pixelRatio,
                  0, 2 * Math.PI, false);
      context.stroke();
      context.fill();
  };

  static measureText(context: CanvasRenderingContext2D, text : string,
                     pixelRatio: number, properties: TripNodeProperties,
                     defaultTextProp: TripNodeProperties) {
    var lines = text.split('\n');
    var size = TripGraphLayer.setTextStyle(
        context, pixelRatio, properties, defaultTextProp);

    var r = { width: 0, height: size * lines.length };

    for (var i in lines) {
      r.width = Math.max(r.width, context.measureText(lines[i]).width);
    }
      
    return r; 
  }

  static setTextStyle(context: CanvasRenderingContext2D, pixelRatio : number,
                     properties: TripNodeProperties,
                     defaultTextProp: TripNodeProperties) : number {
    properties = properties || {};
    var fontSize = properties.fontSize || defaultTextProp.fontSize;
    fontSize *= pixelRatio;
    context.font = fontSize + 'px ' + (properties.font || 'Helvetica');
    context.strokeStyle = properties.stroke || defaultTextProp.stroke ;
    context.lineWidth = (properties.haloWidth || 4) * pixelRatio;
    context.fillStyle = properties.fill || defaultTextProp.fill;
    return parseInt(''+ fontSize);
  };

  static drawText(context : CanvasRenderingContext2D, text : string,
                  pos : IPoint, pixelRatio : number,
                  properties: TripNodeProperties,
                  defaultTextProp: TripNodeProperties) {
    var offset = (properties.textOffset != undefined ? properties.textOffset : 20)
      * pixelRatio;

    var dx, dy;
    var placement = ((properties.textPlacement || 'S') + '').toUpperCase();

    // horizontal settings
    switch (placement) {
      default:
      case 'C':
      case 'N':
      case 'S':
        context.textAlign = 'center';
        dx = 0;
        break;

      case 'E':
      case 'NE':
        context.textAlign = 'start';
        dx = offset;
        break;

      case 'O':
      case 'W':
        context.textAlign = 'end';
        dx = -offset;
        break;
    }

    // vertical settings
    switch (placement) {
      case 'C':
      case 'E':
      case 'W':
      case 'O':
        context.textBaseline = 'middle';
        dy = 0;
        break;

      case 'N':
      case 'NE':
        context.textBaseline = 'bottom';
        dy = -offset;
        break;

      default:
      case 'S':
        context.textBaseline = 'top';
        dy = offset;
        break;
    }
    let x : number = pos.x + dx;
    let y : number = pos.y + dy;

    let h : number = TripGraphLayer.setTextStyle(
        context, pixelRatio, properties, defaultTextProp);

    let lines = text.split('\n');

    context.shadowBlur = 3 * pixelRatio;
    context.shadowColor = '#ffffff';

    context.lineWidth = 2 * pixelRatio;

    let vshift : number = (lines.length - 1) / 2;
    for (var i = 0 ; i < lines.length; ++i) {
      let line_y : number = y + (i - vshift) * h;
      context.strokeText(lines[i], x, line_y);
      context.fillText(lines[i], x, line_y);
    }

    context.shadowColor = 'transparent';
  }

  static drawIcon(context:CanvasRenderingContext2D, iconData: any, icon: any,
           pos: IPoint, pixelRatio:number) {
    if (!iconData) {
      return;
    }
    var width = (icon.width ? icon.width * pixelRatio : 16 * pixelRatio);
    var height = (icon.height ? icon.height * pixelRatio : width);
    var ratioX = icon.ratioX || .5;
    var ratioY = icon.ratioY || .5;
    var dx = width * ratioX;
    var dy = height * ratioY;
    if (icon.angle) {
      context.save();
      context.translate(pos.x, pos.y);
      context.rotate(icon.angle);
      context.drawImage(iconData, -dx, -dy, width, height);
      context.restore();
    } else {
      context.drawImage(iconData, pos.x - dx, pos.y - dy, width, height);
    }
  }

  getLabelIconSize(context: CanvasRenderingContext2D, node: TripNode) : Size2D {
    var pixelRatio = this.renderer.pixelRatio;
    var labelIcon = node.labelIcon;

    return {
      width: (labelIcon.width || 16) * pixelRatio,
      height: (labelIcon.height || labelIcon.width || 16) * pixelRatio,
    };
  };

  // Modify TripGraph to place labels at appropriate places
  placeLabels(context : CanvasRenderingContext2D) {
    var pinchZoom = this.renderer.pinchZoom;
    var pixelRatio = this.renderer.pixelRatio;
    var labelArray = [];
    var anchorArray = [];
    for (var i in this.graph.nodes) {
      var node = this.graph.nodes[i];
      if (!node.label && !node.labelIcon) {
        continue;
      }
      var pos = pinchZoom.viewerPosFromWorldPos(node.coord);
      var radius = this.defaultRadius;
      if (node.properties && node.properties.radius) {
        radius = node.properties.radius;
      }
      anchorArray.push({
        x: pos.x,
        y: pos.y,
        r: radius * pixelRatio
      });
      var margin = 2 * pixelRatio;

      var size, name;
      if (node.label) {
        size = TripGraphLayer.measureText(context, node.label, pixelRatio,
                                          node.properties, this.defaultTextProp);
        name = node.label;
      } else if (node.labelIcon) {
        size = this.getLabelIconSize(context, node);
        name = 'icon:' + node.labelIcon.url;
      }
      labelArray.push({
        x: pos.x,
        y: pos.y,
        name: name,
        width: size.width + 2 * margin,
        height: size.height + 2 * margin,
        node: node
      });
    }
    var labeler = d3.labeler()
      .label(labelArray)
      .anchor(anchorArray)
      .width(this.renderer.canvas.width)
      .height(this.renderer.canvas.height);

    var originalEnergy = labeler.alt_energy();
    var me = this;
    var bezierCurves = [];
    var bezierBbox = [];
    var bezierLUT = [];
    for (var e in this.graph.edges) {
      var curves = this.graph.bezier(this.graph.edges[e]);
      for (var i in curves) {
        var curve = curves[i];
        bezierCurves.push(curve);
        var bbox = curve.bbox();
        bezierBbox.push({
          min: pinchZoom.viewerPosFromWorldPos(bbox.x.min, bbox.y.min),
          max: pinchZoom.viewerPosFromWorldPos(bbox.x.max, bbox.y.max)
        });
        var lut = curve.getLUT(30);
        var transformedLut = [];
        for (var i in lut) {
          transformedLut.push(pinchZoom.viewerPosFromWorldPos(lut[i]));
        }
        bezierLUT.push(transformedLut);
      }
    }

    labeler.alt_energy(function(index, lab, anc) {
      let curveOverlaps = 0;

      let box = labeler.boxOfLabel(index);
      let labBbox = new BoundingBox();
      labBbox.addPoint(new Point(box.left, box.top));
      labBbox.addPoint(new Point(box.right, box.bottom));

      for (var i in bezierCurves) {
        if (!BoundingBox.overlaps(bezierBbox[i], labBbox)) {
          continue;
        }

        var lut = bezierLUT[i];
        for (var j in lut) {
          if (labBbox.contains(lut[j])) {
            curveOverlaps++;
          }
        }
      }
      return curveOverlaps * 10 + originalEnergy(index);
    });

    var finalEnergy = labeler.start(5000, 1);

    for (var i in labelArray) {
      var entry = labelArray[i];
      if (!entry.node.properties) {
        entry.node.properties = {};
      }
      var properties = entry.node.properties;
      var halfSize = Point.times(1/2, new Point(entry.width, entry.height));
      properties.labelCoord = pinchZoom.worldPosFromViewerPos(entry);
      properties.labelBbox = {
        min: pinchZoom.worldPosFromViewerPos(Point.minus(entry, halfSize)),
        max: pinchZoom.worldPosFromViewerPos(Point.plus(entry, halfSize))
      };

      TripGraph.placeLeaderLine(entry.node);
      properties.textPlacement = 'C';
      properties.textOffset = 0;
    }
  }

  static shallowCopy( original : any ) : any {
      // First create an empty object with
      // same prototype of our original source
      var clone = Object.create( Object.getPrototypeOf( original ) ) ;

      var i , keys = Object.getOwnPropertyNames( original ) ;

      for ( i = 0 ; i < keys.length ; i ++ )
      {
          // copy each property into the clone
          Object.defineProperty( clone , keys[ i ] ,
              Object.getOwnPropertyDescriptor( original , keys[ i ] )
          ) ;
      }

      return clone ;
  }

  makeFusedGraph(graph : TripGraph) : TripGraph {
    graph = graph || this.graph;

    var renameDict = {};
    var fuseNodePair = function(a, b) {
      var r = TripGraphLayer.shallowCopy(a);
      r.name = a.name + '' + b.name;
      r.label = a.label + '\n' + b.label;
      renameDict[a.name] = renameDict[b.name] = r.name;
      return r;
    };

    var lookup = function(name) {
      var r = name;
      while (r in renameDict) {
        r = renameDict[r];
      }
      return r;
    };

    var pinchZoom = this.renderer.pinchZoom;
    for (var i in graph.nodes) {
      var node = graph.nodes[i];
      node.viewerPos = pinchZoom.viewerPosFromWorldPos(node.coord);
    }

    var keptNodes = [];
    for (var j in graph.nodes) {
      var node = graph.nodes[j];

      if (!node.label) {
        continue;
      }

      var r = this.nodeRadius(node);
      var keep = true;

      for (var i in keptNodes) {
        var n = keptNodes[i];

        var dist = Point.dist(n.viewerPos, node.viewerPos);
        if (dist < (this.nodeRadius(n) + r)) {
          keptNodes[i] = fuseNodePair(n, node);
          keep = false;
          break;
        }
      }
      if (keep) {
        keptNodes.push(node);
      }
    }

    for (var j in graph.nodes) {
      var node = graph.nodes[j];

      if (!node.label) {
        keptNodes.push(node);
      }
    }


    var result = new TripGraph();

    for (var i in keptNodes) {
      var n = keptNodes[i];
      result.nodes[n.name] = n;
    }

    for (var i in graph.edges) {
      var edge = graph.edges[i];

      var na = lookup(edge.from);
      var nb = lookup(edge.to);

      if (na != nb) {
        var newEdge = TripGraphLayer.shallowCopy(edge);
        newEdge.from = na;
        newEdge.to = nb;
        newEdge.originalEdge = edge;
        result.edges.push(newEdge);
      }
    }

    return result;
  };

  forEachNode(cb : (node : TripNode) => void) {
    for (var i in this.graph.nodes) {
      cb(this.graph.nodes[i]);
    }
  }

  loadIcons(cb: (err? : Error) => void) {
    var me = this;
    this.iconsToLoad = 1;
    this.failedIcons = 0;
    var iconLoaded = function() {
      me.iconsToLoad--;
      if (cb && me.iconsToLoad == 0) {
        if (me.failedIcons > 0) {
          cb(new Error(me.failedIcons + ' icons failed to load.'));
        } else {
          cb();
        }
      }
    };

    this.forEachNode(function(node) {
      if (node.labelIcon) {
        var url = node.labelIcon.url;
        me.iconsToLoad++;
        me.renderer.loadImage(node.labelIcon.url,
          function(data) {
            me.icons[url] = data;
            iconLoaded();
          },
          function(err) {
            console.log('Failed to load: ' + url);
            me.failedIcons++;
            iconLoaded();
          }
        );
      }
    });

    iconLoaded();
  };

  saveToObj() : TripSaved {
    return {
      graph: this.graph,
      location: this.renderer.location,
      defaultRadius: this.defaultRadius,
      defaultTextProp: this.defaultTextProp,
      width: this.renderer.canvas.width / this.renderer.pixelRatio,
      height: this.renderer.canvas.height / this.renderer.pixelRatio,
      world: this.renderer.layers[0].save()
    };
  };

  saveToString() : string {
    return JSON.stringify(this.saveToObj());
  };

  load(data : TripSaved) {
    if (typeof data == 'string') {
      data = JSON.parse(data);
    }
    this.graph = new TripGraph(data.graph);
    this.defaultRadius = data.defaultRadius;
    this.defaultTextProp = data.defaultTextProp;
    for (var key in data.world) {
      this.renderer.layers[0].params[key] = data.world[key];
    }
  };

};
