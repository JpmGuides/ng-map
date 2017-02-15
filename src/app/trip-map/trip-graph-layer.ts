import { TripGraph } from './trip-graph';
import { TripEdge } from './trip-edge';
import { TripNode, TripNodeProperties } from './trip-node';
import { BoundingBox } from './bounding-box';
import { Size2D } from './size2d';
import { TripSaved } from './trip-saved';
import { Point, IPoint } from './point';

declare const d3: any;
declare const Bezier: any;

export interface Location {
  x: Number;
  y: Number;
  scale: Number;
}

export interface CanvasTilesRendererParams {
  url: String;
  initialLocation: Location;
  canvas: HTMLCanvasElement;
}

declare class CanvasTilesRenderer {
  pixelRatio: number;
  layers: any[];
  pinchZoom: PinchZoom;
  canvas: HTMLCanvasElement;
  location: Location;

  constructor (parameters: CanvasTilesRendererParams);
  addLayer(l: any);
  refresh();
  refreshIfNotMoving();

  setLocation(loc: Location);
  loadImage(url: string,
            success: (data: any) => void,
            failure: (err: string) => void);
}

declare class PinchZoom {
  touchEventHandlers: any[];

  viewerPosFromWorldPos(x: IPoint | number[] | number, y?: number): Point;
  worldPosFromViewerPos(x: IPoint | number[] | number, y?: number): Point;
}


export interface TripGraphLayerParams {
  renderer: CanvasTilesRenderer;
  graph: TripGraph;
  defaultRadius?: number;
  defaultFontSize?: number;
};

export class TripGraphLayer {
  public graph: TripGraph;
  public defaultTextProp: TripNodeProperties;

  private renderer: CanvasTilesRenderer;
  private defaultRadius: number;
  private icons: any;

  private iconsToLoad: number;
  private failedIcons: number;

  constructor(private params: TripGraphLayerParams) {
    this.renderer = params.renderer;
    this.defaultRadius = params.defaultRadius || 6;
    this.icons = {};
    this.defaultTextProp = {
      fontSize: params.defaultFontSize || 20,
      stroke: 'rgba(255,255,255,.8)',
      fill: '#000000'
    };

    if (!this.renderer) {
      throw(new Error('TripGraphLayer: no renderer !'));
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

      let bezierCurves = graph.bezier(edge);
      for (let i in bezierCurves ) {
        let bezier = bezierCurves[i];
        TripGraphLayer.drawBezier(context, pinchZoom, bezier, pixelRatio);
      }
      if (bezierCurves.length > 1 && edge.drawMiddlePoint) {
        for (let i in bezierCurves) {
          let p = pinchZoom.viewerPosFromWorldPos(bezierCurves[i].points[3]);
          let radius = 5 * pixelRatio;
          context.beginPath();
          context.arc(p.x, p.y, radius, 0, 2 * Math.PI, false);
          context.fillStype = '#000000';
          context.fill();
        }
      }
    });


    for (let i in graph.nodes) {
      let node = graph.nodes[i];
      node.viewerPos = pinchZoom.viewerPosFromWorldPos(node.coord);
    }

    for (let i in graph.nodes) {
      this.drawNodePoint(context, pinchZoom, graph.nodes[i]);
    }
    for (let i in graph.nodes) {
      this.drawLeaderLine(context, pinchZoom, graph.nodes[i]);
    }
    for (let i in graph.nodes) {
      this.drawNodeLabel(context, pinchZoom, graph.nodes[i]);
    }
  }

  static drawBezier(context: CanvasRenderingContext2D, pinchZoom: any,
                    curve: any, pixelRatio: number) {

    let ptArray = new Array(8);
    let points = curve.points;
    for (let j = 0; j < 4; ++j) {
      let p = pinchZoom.viewerPosFromWorldPos(points[j]);
      ptArray[j * 2] = p.x;
      ptArray[j * 2 + 1] = p.y;
    }

    let bezier = new Bezier(ptArray);
    let l = bezier.length();
    let numArrows = Math.min(2, Math.floor(l / (pixelRatio * 30)));
    let size = 10 * pixelRatio;

    for (let i = 1; i < numArrows; ++i) {
      let t = i / numArrows;
      let p = bezier.get(t);
      let n = bezier.normal(t);
      let tangent = new Point(bezier.derivative(t));
      tangent.mul(size / tangent.norm());
      p = Point.plus(p, Point.times(.5, tangent));
      let base = Point.minus(p, tangent);

      context.beginPath();
      context.moveTo(base.x + (size/2) * n.x, base.y + (size/2) * n.y);
      context.lineTo(p.x, p.y);
      context.lineTo(base.x - (size/2) * n.x, base.y - (size/2) * n.y);
      context.closePath();
      context.fill();
    }

    let viewcurve = bezier.points;

    context.beginPath();
    context.moveTo(viewcurve[0].x, viewcurve[0].y);
    context.bezierCurveTo(
        viewcurve[1].x, viewcurve[1].y,
        viewcurve[2].x, viewcurve[2].y,
        viewcurve[3].x, viewcurve[3].y);

    context.stroke();
  }

  setEdgeStrokeStyle(context: CanvasRenderingContext2D, edge: TripEdge) {
    let style = edge.lineColor || '#003300';
    context.strokeStyle = style;
    context.fillStyle = style;
    context.lineWidth = this.renderer.pixelRatio * (edge.lineWidth || 2);
  };

  nodeRadius(node: TripNode): number {
    let r = this.defaultRadius;
    if (node.properties && node.properties.radius) {
      r = node.properties.radius;
    }
    return r * this.renderer.pixelRatio;
  };

  drawNodePoint(context: CanvasRenderingContext2D, pinchZoom: any, node: TripNode) {
    if (node.properties && node.properties.point == false) {
      return;
    }
    let pos = node.viewerPos;
    this.drawPoint(context, pos, this.renderer.pixelRatio, node.properties || {});
  }

  drawNodeLabel(context: CanvasRenderingContext2D, pinchZoom: any, node: TripNode) {
    if (node.label || node.labelIcon) {
      if (node.properties && node.properties.labelCoord) {
        let labelPoint = pinchZoom.viewerPosFromWorldPos(node.properties.labelCoord);
      }
      let pos = labelPoint || pinchZoom.viewerPosFromWorldPos(node.coord);
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
        let size = TripGraphLayer.measureText(
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
      let pixelRatio = this.renderer.pixelRatio;
      let p = pinchZoom.viewerPosFromWorldPos(node.properties.leaderLineAnchor);
      context.lineWidth = (node.properties.leaderLineWidth || 1) * pixelRatio;
      context.beginPath();

      let pos = pinchZoom.viewerPosFromWorldPos(node.coord);
      let radius = this.nodeRadius(node);
      let closest = pinchZoom.viewerPosFromWorldPos(
          BoundingBox.closestPoint(new Point(node.coord), node.properties.labelBbox));

      if (Point.dist(closest, pos) > (3*radius)) {
        if (node.properties.dashed) {
          let scaled = [];
          for (let i in node.properties.dashed) {
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

  drawPoint(context: CanvasRenderingContext2D, p: IPoint, pixelRatio: number, properties: TripNodeProperties) {
      context.strokeStyle = "rgba(0,0,0,1)";
      context.fillStyle = "rgba(255,255,255,1)";
      context.lineWidth = 2 * pixelRatio;
      context.beginPath();
      context.arc(p.x, p.y, (properties.radius || this.defaultRadius) * pixelRatio,
                  0, 2 * Math.PI, false);
      context.stroke();
      context.fill();
  };

  static measureText(context: CanvasRenderingContext2D, text: string,
                     pixelRatio: number, properties: TripNodeProperties,
                     defaultTextProp: TripNodeProperties) {
    let lines = text.split('\n');
    let size = TripGraphLayer.setTextStyle(
        context, pixelRatio, properties, defaultTextProp);

    let r = { width: 0, height: size * lines.length };

    for (let i in lines) {
      r.width = Math.max(r.width, context.measureText(lines[i]).width);
    }
      
    return r; 
  }

  static setTextStyle(context: CanvasRenderingContext2D, pixelRatio: number,
                     properties: TripNodeProperties,
                     defaultTextProp: TripNodeProperties): number {
    properties = properties || {};
    let fontSize = properties.fontSize || defaultTextProp.fontSize;
    fontSize *= pixelRatio;
    context.font = fontSize + 'px ' + (properties.font || 'Helvetica');
    context.strokeStyle = properties.stroke || defaultTextProp.stroke ;
    context.lineWidth = (properties.haloWidth || 4) * pixelRatio;
    context.fillStyle = properties.fill || defaultTextProp.fill;
    return parseInt(''+ fontSize);
  };

  static drawText(context: CanvasRenderingContext2D, text: string,
                  pos: IPoint, pixelRatio: number,
                  properties: TripNodeProperties,
                  defaultTextProp: TripNodeProperties) {
    let offset = (properties.textOffset != undefined ? properties.textOffset: 20)
      * pixelRatio;

    let dx, dy;
    let placement = ((properties.textPlacement || 'S') + '').toUpperCase();

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
    let x: number = pos.x + dx;
    let y: number = pos.y + dy;

    let h: number = TripGraphLayer.setTextStyle(
        context, pixelRatio, properties, defaultTextProp);

    let lines = text.split('\n');

    context.shadowBlur = 3 * pixelRatio;
    context.shadowColor = '#ffffff';

    context.lineWidth = 2 * pixelRatio;

    let vshift: number = (lines.length - 1) / 2;
    for (let i = 0 ; i < lines.length; ++i) {
      let line_y: number = y + (i - vshift) * h;
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
    let width = (icon.width ? icon.width * pixelRatio: 16 * pixelRatio);
    let height = (icon.height ? icon.height * pixelRatio: width);
    let ratioX = icon.ratioX || .5;
    let ratioY = icon.ratioY || .5;
    let dx = width * ratioX;
    let dy = height * ratioY;
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

  getLabelIconSize(context: CanvasRenderingContext2D, node: TripNode): Size2D {
    let pixelRatio = this.renderer.pixelRatio;
    let labelIcon = node.labelIcon;

    return {
      width: (labelIcon.width || 16) * pixelRatio,
      height: (labelIcon.height || labelIcon.width || 16) * pixelRatio,
    };
  };

  // Modify TripGraph to place labels at appropriate places
  placeLabels(context: CanvasRenderingContext2D) {
    let pinchZoom = this.renderer.pinchZoom;
    let pixelRatio = this.renderer.pixelRatio;
    let labelArray = [];
    let anchorArray = [];
    for (let i in this.graph.nodes) {
      let node = this.graph.nodes[i];
      if (!node.label && !node.labelIcon) {
        continue;
      }
      let pos = pinchZoom.viewerPosFromWorldPos(node.coord);
      let radius = this.defaultRadius;
      if (node.properties && node.properties.radius) {
        radius = node.properties.radius;
      }
      anchorArray.push({
        x: pos.x,
        y: pos.y,
        r: radius * pixelRatio
      });
      let margin = 2 * pixelRatio;

      let size, name;
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
    let labeler = d3.labeler()
      .label(labelArray)
      .anchor(anchorArray)
      .width(this.renderer.canvas.width)
      .height(this.renderer.canvas.height);

    let originalEnergy = labeler.alt_energy();
    let me = this;
    let bezierCurves = [];
    let bezierBbox = [];
    let bezierLUT = [];
    for (let e in this.graph.edges) {
      let curves = this.graph.bezier(this.graph.edges[e]);
      for (let i in curves) {
        let curve = curves[i];
        bezierCurves.push(curve);
        let bbox = curve.bbox();
        bezierBbox.push({
          min: pinchZoom.viewerPosFromWorldPos(bbox.x.min, bbox.y.min),
          max: pinchZoom.viewerPosFromWorldPos(bbox.x.max, bbox.y.max)
        });
        let lut = curve.getLUT(30);
        let transformedLut = [];
        for (let i in lut) {
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

      for (let i in bezierCurves) {
        if (!BoundingBox.overlaps(bezierBbox[i], labBbox)) {
          continue;
        }

        let lut = bezierLUT[i];
        for (let j in lut) {
          if (labBbox.contains(lut[j])) {
            curveOverlaps++;
          }
        }
      }
      return curveOverlaps * 10 + originalEnergy(index);
    });

    let finalEnergy = labeler.start(5000, 1);

    for (let i in labelArray) {
      let entry = labelArray[i];
      if (!entry.node.properties) {
        entry.node.properties = {};
      }
      let properties = entry.node.properties;
      let halfSize = Point.times(1/2, new Point(entry.width, entry.height));
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

  static shallowCopy( original: any ): any {
      // First create an empty object with
      // same prototype of our original source
      let clone = Object.create( Object.getPrototypeOf( original ) ) ;

      let i , keys = Object.getOwnPropertyNames( original ) ;

      for ( i = 0 ; i < keys.length ; i ++ )
      {
          // copy each property into the clone
          Object.defineProperty( clone , keys[ i ] ,
              Object.getOwnPropertyDescriptor( original , keys[ i ] )
          ) ;
      }

      return clone ;
  }

  makeFusedGraph(graph: TripGraph): TripGraph {
    graph = graph || this.graph;

    let renameDict = {};
    let fuseNodePair = function(a, b) {
      let r = TripGraphLayer.shallowCopy(a);
      r.name = a.name + '' + b.name;
      r.label = a.label + '\n' + b.label;
      renameDict[a.name] = renameDict[b.name] = r.name;
      return r;
    };

    let lookup = function(name) {
      let r = name;
      while (r in renameDict) {
        r = renameDict[r];
      }
      return r;
    };

    let pinchZoom = this.renderer.pinchZoom;
    for (let i in graph.nodes) {
      let node = graph.nodes[i];
      node.viewerPos = pinchZoom.viewerPosFromWorldPos(node.coord);
    }

    let keptNodes = [];
    for (let j in graph.nodes) {
      let node = graph.nodes[j];

      if (!node.label) {
        continue;
      }

      let r = this.nodeRadius(node);
      let keep = true;

      for (let i in keptNodes) {
        const n = keptNodes[i];

        const dist = Point.dist(n.viewerPos, node.viewerPos);
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

    for (let j in graph.nodes) {
      const node = graph.nodes[j];

      if (!node.label) {
        keptNodes.push(node);
      }
    }


    const result = new TripGraph();

    for (let i in keptNodes) {
      const n = keptNodes[i];
      result.nodes[n.name] = n;
    }

    for (let i in graph.edges) {
      const edge = graph.edges[i];

      const na = lookup(edge.from);
      const nb = lookup(edge.to);

      if (na != nb) {
        let newEdge = TripGraphLayer.shallowCopy(edge);
        newEdge.from = na;
        newEdge.to = nb;
        newEdge.originalEdge = edge;
        result.edges.push(newEdge);
      }
    }

    return result;
  };

  forEachNode(cb: (node: TripNode) => void) {
    for (let i in this.graph.nodes) {
      cb(this.graph.nodes[i]);
    }
  }

  loadIcons(cb: (err?: Error) => void) {
    const me = this;
    this.iconsToLoad = 1;
    this.failedIcons = 0;
    const iconLoaded = function() {
      me.iconsToLoad--;
      if (cb && me.iconsToLoad === 0) {
        if (me.failedIcons > 0) {
          cb(new Error(me.failedIcons + ' icons failed to load.'));
        } else {
          cb();
        }
      }
    };

    this.forEachNode(function(node) {
      if (node.labelIcon) {
        const url = node.labelIcon.url;
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

  saveToObj(): TripSaved {
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

  saveToString(): string {
    return JSON.stringify(this.saveToObj());
  };

  load(data: TripSaved) {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    this.graph = new TripGraph(data.graph);
    this.defaultRadius = data.defaultRadius;
    this.defaultTextProp = data.defaultTextProp;
    for (let key in data.world) {
      this.renderer.layers[0].params[key] = data.world[key];
    }
  };

};
