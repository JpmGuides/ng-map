import { Point, IPoint } from './point';
import { TripNode } from './trip-node';
import { TripEdge } from './trip-edge';

import { BoundingBox } from './bounding-box';
//import { Bezier } from 'bezier-js';

declare var d3 : any;
declare var Bezier : any;

export class TripGraph {
  nodes : { [name: string] : TripNode };
  edges : TripEdge[];

  constructor(graph? : any) {
    let g = graph || {};
    this.nodes = g.node || {};
    this.edges = g.edges || [];
  }

  static createFromStopovers(stopovers : TripNode[]) : TripGraph {
    let result = new TripGraph();

    for (let stop of stopovers) {
      result.nodes[stop.name] = stop;
      stop.coord = new Point(stop.coord);
    }

    let realstopovers = [];
    for (let stop of stopovers) {
      if (!stop.properties || stop.properties.point != false) {
        realstopovers.push(stop);
      }
    }

    for (let i = 1; i < realstopovers.length; ++i) {
      result.edges.push({
        from: realstopovers[i-1].name,
        to: realstopovers[i].name,
        controlPoints: TripGraph.generateControlPoints(
            (i >= 2 ? realstopovers[i-2].coord : undefined),
            realstopovers[i-1].coord,
            realstopovers[i].coord,
            ((i + 1) < realstopovers.length ? realstopovers[i+1].coord : undefined)
            )
        });
    }
    return result;
  };

  createDefaultBezier() {
    for (var i in this.edges) {
      var e = this.edges[i];
      var from = this.nodes[e.from];
      var to = this.nodes[e.to];

      this.edges[i] = {
        from: e.from,
        to: e.to,
        controlPoints: TripGraph.generateControlPoints(undefined,
                                                       from.coord, to.coord,
                                                       undefined)
      };
    }
  }


  static generateControlPoints(
      p0 : Point, p1 : Point, p2 : Point, p3 : Point) : Point[] {
    let delta = Point.minus(p2, p1).mul(1/3);
    let norm = new Point(-delta.y, delta.x);
    return [
      Point.plus(Point.plus(p1,delta), norm),
      Point.plus(Point.minus(p2,delta), norm)
    ];
  };

  static bezierFromPoints(points : IPoint[]) : any {
    var result = [];
    for (var i = 0; i < 4; ++i) {
      result.push(points[i].x);
      result.push(points[i].y);
    }
    return new Bezier(result);
  };

  static bezierThroughPoints(points : IPoint[]) {
    var result = [];
    var t = .2;
    for (var i = 1; i < points.length; ++i) {
      var prev = (i == 1 ? points[i-1] : points[i-2]);
      var a = points[i-1];
      var b = points[i];
      var next = (i == (points.length - 1) ? points[i] : points[i+1]);
      result.push(TripGraph.bezierFromPoints([
        a,
        Point.plus(a, Point.times(t, Point.minus(b, prev))),
        Point.plus(b, Point.times(t, Point.minus(a, next))),
        b]));
    }
    return result;
  };

  bezier(edge : TripEdge) : any[] {
    if (!edge.controlPoints || edge.hidden) {
      return [];
    }

    if (edge.controlPoints.length == 2) {
      var points = [
        this.nodes[edge.from].coord,
        edge.controlPoints[0],
        edge.controlPoints[1],
        this.nodes[edge.to].coord
      ];
      return [TripGraph.bezierFromPoints(points)];
    } else if (edge.controlPoints.length == 5) {
      var points1 = [
        this.nodes[edge.from].coord,
        edge.controlPoints[0],
        edge.controlPoints[1],
        edge.controlPoints[2],
      ];
      var points2 = [
        edge.controlPoints[2],
        edge.controlPoints[3],
        edge.controlPoints[4],
        this.nodes[edge.to].coord
      ];
      return [
        TripGraph.bezierFromPoints(points1),
        TripGraph.bezierFromPoints(points2)
      ];
    } else {
      var allPoints = [this.nodes[edge.from].coord]
        .concat(edge.controlPoints, [ this.nodes[edge.to].coord ]);
      return TripGraph.bezierThroughPoints(allPoints);
    }
  }

  bounds() : BoundingBox {
    let r = new BoundingBox();
    for (var i in this.nodes) {
      r.addPoint(this.nodes[i].coord);
    }
    return r;
  }

  // Returns a rectangle containing all the nodes with the desired aspect ratio
  // and margin factor.
  //
  // aspectRatio: width / height
  frame(aspectRatio? : number, marginRatio? : Point | number) : BoundingBox {
    let bounds = this.bounds();
    marginRatio = marginRatio || 1.1;
    aspectRatio = aspectRatio
      || (bounds.max.x - bounds.min.x) / (bounds.max.y - bounds.min.y);

    var margin = (typeof(marginRatio) == 'number' ?
                  new Point(marginRatio, marginRatio) : marginRatio);

    var initialSize = Point.minus(bounds.max, bounds.min);
    initialSize.x *= margin.x;
    initialSize.y *= margin.y;

    var widthFromHeight = initialSize.y * aspectRatio;

    var size;
    if (initialSize.x > widthFromHeight) {
      size = new Point(initialSize.x, initialSize.x / aspectRatio);
    } else {
      size = new Point(initialSize.y * aspectRatio, initialSize.y);
    }

    size.mul(.5);
    var center = Point.times(0.5, Point.plus(bounds.max, bounds.min));
    let result = new BoundingBox();
    result.addPoint(Point.minus(center, size));
    result.addPoint(Point.plus(center, size));
    return result;
  }

  location(aspectRatio? : number, marginRatio? : Point | number) {
    var frame = this.frame(aspectRatio, marginRatio);
    return {
      x: (frame.max.x + frame.min.x) / 2,
      y: (frame.max.y + frame.min.y) / 2,
      scale: (frame.max.x - frame.min.x)
    };
  }

  static placeLeaderLine(node : TripNode) {
    if (!node.properties) {
      node.properties = {};
    }
    var placement = node.properties.leaderLine || 'bestAnchor';

    var bbox = node.properties.labelBbox;
    var anchor;
    if (placement == 'center') {
      var width = bbox.max.x - bbox.min.x;
      var center = new Point((bbox.min.x + bbox.max.x) / 2,
                             (bbox.min.y + bbox.max.y) / 2);
      var toCoord = Point.minus(node.coord, center);
      toCoord.mul(.6 * width / Point.norm(toCoord));
      anchor = Point.plus(center, toCoord);
    } else if (placement == 'closestOnBbox') {
      anchor = BoundingBox.closestPoint(node.coord, bbox);
    } else {
      anchor = d3.labeler.closestLineAnchorPoint(
            node.coord,
            {
              left: bbox.min.x,
              right: bbox.max.x,
              top: bbox.min.y,
              bottom: bbox.max.y,
              cx: (bbox.min.x + bbox.max.x) / 2,
              cy: (bbox.min.y + bbox.max.y) / 2
            }
        );
    }

    node.properties.leaderLineAnchor = anchor;
  }

}
