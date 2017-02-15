import { Point, IPoint } from './point';
import { TripNode } from './trip-node';
import { TripEdge } from './trip-edge';

import { BoundingBox } from './bounding-box';

declare var d3: any;
declare var Bezier: any;

export class TripGraph {
  nodes: { [name: string]: TripNode };
  edges: TripEdge[];

  static createFromStopovers(stopovers: TripNode[]): TripGraph {
    const result = new TripGraph();

    for (let stop of stopovers) {
      result.nodes[stop.name] = stop;
      stop.coord = new Point(stop.coord);
    }

    const realstopovers = [];
    for (let stop of stopovers) {
      if (!stop.properties || stop.properties.point !== false) {
        realstopovers.push(stop);
      }
    }

    for (let i = 1; i < realstopovers.length; ++i) {
      result.edges.push({
        from: realstopovers[i - 1].name,
        to: realstopovers[i].name,
        controlPoints: TripGraph.generateControlPoints(
            (i >= 2 ? realstopovers[i - 2].coord : undefined),
            realstopovers[i - 1].coord,
            realstopovers[i].coord,
            ((i + 1) < realstopovers.length ? realstopovers[i + 1].coord : undefined)
            )
        });
    }
    return result;
  };

  static generateControlPoints(
      p0: Point, p1: Point, p2: Point, p3: Point): Point[] {
    const delta = Point.minus(p2, p1).mul(1 / 3);
    const norm = new Point(-delta.y, delta.x);
    return [
      Point.plus(Point.plus(p1, delta), norm),
      Point.plus(Point.minus(p2, delta), norm)
    ];
  };

  static bezierFromPoints(points: IPoint[]): any {
    const result = [];
    for (let i = 0; i < 4; ++i) {
      result.push(points[i].x);
      result.push(points[i].y);
    }
    return new Bezier(result);
  };

  static bezierThroughPoints(points: IPoint[]) {
    const result = [];
    const t = .2;
    for (let i = 1; i < points.length; ++i) {
      const prev = (i === 1 ? points[i - 1] : points[i - 2]);
      const a = points[i - 1];
      const b = points[i];
      const next = (i === (points.length - 1) ? points[i] : points[i + 1]);
      result.push(TripGraph.bezierFromPoints([
        a,
        Point.plus(a, Point.times(t, Point.minus(b, prev))),
        Point.plus(b, Point.times(t, Point.minus(a, next))),
        b]));
    }
    return result;
  };

  static placeLeaderLine(node: TripNode) {
    if (!node.properties) {
      node.properties = {};
    }
    const placement = node.properties.leaderLine || 'bestAnchor';

    const bbox = node.properties.labelBbox;
    let anchor;
    if (placement === 'center') {
      const  width = bbox.max.x - bbox.min.x;
      const  center = new Point((bbox.min.x + bbox.max.x) / 2,
                                (bbox.min.y + bbox.max.y) / 2);
      const  toCoord = Point.minus(node.coord, center);
      toCoord.mul(.6 * width / Point.norm(toCoord));
      anchor = Point.plus(center, toCoord);
    } else if (placement === 'closestOnBbox') {
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
  constructor(graph?: any) {
    const g = graph || {};
    this.nodes = g.node || {};
    this.edges = g.edges || [];
  }

  createDefaultBezier() {
    for (let i in this.edges) {
      const e = this.edges[i];
      const from = this.nodes[e.from];
      const to = this.nodes[e.to];

      this.edges[i] = {
        from: e.from,
        to: e.to,
        controlPoints: TripGraph.generateControlPoints(undefined,
                                                       from.coord, to.coord,
                                                       undefined)
      };
    }
  }

  bezier(edge: TripEdge): any[] {
    if (!edge.controlPoints || edge.hidden) {
      return [];
    }

    if (edge.controlPoints.length === 2) {
      const points = [
        this.nodes[edge.from].coord,
        edge.controlPoints[0],
        edge.controlPoints[1],
        this.nodes[edge.to].coord
      ];
      return [TripGraph.bezierFromPoints(points)];
    } else if (edge.controlPoints.length === 5) {
      const points1 = [
        this.nodes[edge.from].coord,
        edge.controlPoints[0],
        edge.controlPoints[1],
        edge.controlPoints[2],
      ];
      const points2 = [
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
      const allPoints = [this.nodes[edge.from].coord]
        .concat(edge.controlPoints, [ this.nodes[edge.to].coord ]);
      return TripGraph.bezierThroughPoints(allPoints);
    }
  }

  bounds(): BoundingBox {
    const r = new BoundingBox();
    for (let i in this.nodes) {
      r.addPoint(this.nodes[i].coord);
    }
    return r;
  }

  // Returns a rectangle containing all the nodes with the desired aspect ratio
  // and margin factor.
  //
  // aspectRatio: width / height
  frame(aspectRatio?: number, marginRatio?: Point | number): BoundingBox {
    const bounds = this.bounds();
    marginRatio = marginRatio || 1.1;
    aspectRatio = aspectRatio
      || (bounds.max.x - bounds.min.x) / (bounds.max.y - bounds.min.y);

    const margin = (typeof(marginRatio) === 'number' ?
                  new Point(marginRatio, marginRatio) : marginRatio);

    const initialSize = Point.minus(bounds.max, bounds.min);
    initialSize.x *= margin.x;
    initialSize.y *= margin.y;

    const widthFromHeight = initialSize.y * aspectRatio;

    let size;
    if (initialSize.x > widthFromHeight) {
      size = new Point(initialSize.x, initialSize.x / aspectRatio);
    } else {
      size = new Point(initialSize.y * aspectRatio, initialSize.y);
    }

    size.mul(.5);
    const center = Point.times(0.5, Point.plus(bounds.max, bounds.min));
    const result = new BoundingBox();
    result.addPoint(Point.minus(center, size));
    result.addPoint(Point.plus(center, size));
    return result;
  }

  location(aspectRatio?: number, marginRatio?: Point | number) {
    const frame = this.frame(aspectRatio, marginRatio);
    return {
      x: (frame.max.x + frame.min.x) / 2,
      y: (frame.max.y + frame.min.y) / 2,
      scale: (frame.max.x - frame.min.x)
    };
  }


}
