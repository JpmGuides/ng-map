import { BoundingBox } from './bounding-box';
import { IPoint, Point } from './point';
import { TripEdge } from './trip-edge';
import { TripGraph } from './trip-graph';
import { TripGraphLayer } from './trip-graph-layer';
import { TripNode, TripNodeProperties } from './trip-node';

interface BezierEdge {
  edge: TripEdge;
}

declare var d3: any;
declare var Utils: any;

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
  worldDistanceFromViewerDistance(dist: number): number;
}

export class TripGraphEditor {
  graph: TripGraph;
  selectedLabel: TripNode;
  onLabelSelect: (node: TripNode) => void;
  renderer: CanvasTilesRenderer;

  selectedBezier: BezierEdge;
  onBezierSelect: (bezier: BezierEdge) => void;

  private startWorldPos: Point;
  private applyDelta: (delta: IPoint) => void;

  static placeLeaderLine(node: TripNode) {
    if (!node.properties) {
      node.properties = {};
    }
    const placement = node.properties.leaderLine || 'bestAnchor';

    const bbox = node.properties.labelBbox;
    let anchor;
    if (placement === 'center') {
      const width = bbox.max.x - bbox.min.x;
      const center = new Point((bbox.min.x + bbox.max.x) / 2,
                               (bbox.min.y + bbox.max.y) / 2);
      const toCoord = Point.minus(node.coord, center);
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
  constructor(renderer: CanvasTilesRenderer, graph: TripGraph) {
    this.graph = graph;
    this.renderer = renderer;
  }


  acceptTouchEvent(viewer: IPoint, world: IPoint, type: string) {
    if (type === 'wheel') {
      return false;
    }

    this.startWorldPos = new Point(world);
    const clickedLabel = this.findLabelAtWorldPos(this.startWorldPos);
    if (clickedLabel) {
      this.selectLabel(clickedLabel);
      const properties = clickedLabel.properties;
      this.applyDelta = function(delta: IPoint) {
        properties.labelCoord.x += delta.x;
        properties.labelCoord.y += delta.y;
        properties.labelBbox.min.x += delta.x;
        properties.labelBbox.min.y += delta.y;
        properties.labelBbox.max.x += delta.x;
        properties.labelBbox.max.y += delta.y;
        TripGraphEditor.placeLeaderLine(clickedLabel);
      };
      return true;
    } else {
      const p = this.closestBezier(world);

      const threshold = this.renderer.pinchZoom.worldDistanceFromViewerDistance(
          10 * this.renderer.pixelRatio);

      if (p && p.d < threshold) {
        const me = this;
        const pointToMove = function(ptOrArray: Point | Point[]) {
          me.applyDelta = function(delta: IPoint) {
            const a: Point[] =
              (Array.isArray(ptOrArray) ? ptOrArray : [ptOrArray]);
            for (let point of a) {
              point.x += delta.x;
              point.y += delta.y;
            }
          };
        };

        const movePointWithOpposite = function(a, pivot, b) {
          me.applyDelta = function(delta) {
            a.x += delta.x;
            a.y += delta.y;
            pivot.x += delta.x / 2;
            pivot.y += delta.y / 2;
          };
        };

        if (p.edge.controlPoints.length === 2) {
          pointToMove(p.edge.controlPoints[p.t < .5 ? 0 : 1]);
        } else if (p.edge.controlPoints.length === 5) {
          if (p.bezier.points[1].x === p.edge.controlPoints[0].x
              && p.bezier.points[1].y === p.edge.controlPoints[0].y) {
            if (p.t < .5) {
              pointToMove(p.edge.controlPoints[0]);
            } else if (p.t < .9) {
              movePointWithOpposite(p.edge.controlPoints[1],
                                    p.edge.controlPoints[2],
                                    p.edge.controlPoints[3]);
            } else {
              pointToMove([p.edge.controlPoints[1],
                          p.edge.controlPoints[2],
                          p.edge.controlPoints[3]]);
            }
          } else {
            if (p.t < .1) {
              pointToMove([p.edge.controlPoints[1],
                          p.edge.controlPoints[2],
                          p.edge.controlPoints[3]]);
            } else if (p.t < .5) {
              movePointWithOpposite(p.edge.controlPoints[3],
                                    p.edge.controlPoints[2],
                                    p.edge.controlPoints[1]);
            } else {
              pointToMove(p.edge.controlPoints[4]);
            }
          }
        } else {
          pointToMove(Point.nearest(world, p.edge.controlPoints));
        }
        this.selectBezier(p);
        return true;
      }
    }

    this.applyDelta = undefined;
    return false;
  };

  selectLabel(label?: TripNode) {
    if (this.selectedLabel) {
      delete this.selectedLabel.properties.frame;
    }
    this.selectedLabel = undefined;
    this.selectBezier();
    this.selectedLabel = label;
    if (this.onLabelSelect) {
      this.onLabelSelect(label);
    }
    if (label) {
      label.properties = label.properties || {};
      label.properties.frame = '#000000';
    }
    this.renderer.refreshIfNotMoving();
  };

  deselectLabel() { return this.selectLabel(); };

  handleMouseDown(event: any) {
    event.preventDefault();
  }

  handleMouseMove(event: any) {
    event.preventDefault();
    const viewerPos = Utils.eventPosInElementCoordinates(event, event.srcElement);
    this.handleMotion(viewerPos);
  }

  handleMotion(viewerPos: Point) {
    if (!this.applyDelta) {
      return;
    }

    const worldPos = this.renderer.pinchZoom.worldPosFromViewerPos(
        viewerPos.x, viewerPos.y);

    const delta = {
      x: worldPos.x - this.startWorldPos.x,
      y: worldPos.y - this.startWorldPos.y
    };
    this.startWorldPos = worldPos;

    this.applyDelta(delta);
    this.renderer.refreshIfNotMoving();
  }

  handleMouseUp(event: any) {
    event.preventDefault();
    this.applyDelta = undefined;
  }

  handleMouseWheel(event: any) {
    event.preventDefault();
  }

  handleStart(event: any) {
    event.preventDefault();
  }

  handleEnd(event: any) {
    event.preventDefault();
    this.applyDelta = undefined;
  }

  handleMove(event: any) {
    event.preventDefault();
    if (event.touches.length !== 1) {
      this.applyDelta = undefined;
      return;
    }

    const viewerPos = Utils.eventPosInElementCoordinates(event.touches[0],
                                                       event.srcElement);
    this.handleMotion(viewerPos);
  }

  closestBezier(p) {
    let nearest;
    for (let e of this.graph.edges) {
      const curves = this.graph.bezier(e);
      for (let b of curves) {
        const candidate = b.project(p);
        if (!nearest || candidate.d < nearest.d) {
          nearest = candidate;
          nearest.edge = e;
          nearest.bezier = b;
        }
      }
    }
    return nearest;
  }

  findLabelAtWorldPos(pos: Point): TripNode {
    const nodes = this.graph.nodes;
    for (let i in nodes) {
      if (nodes.hasOwnProperty(i)) {
        let node = this.graph.nodes[i];
        if (node.properties && node.properties.labelBbox
            && BoundingBox.contains(node.properties.labelBbox, pos)) {
          return node;
        }
      }
    }
    return undefined;
  };

  selectBezier(b?: BezierEdge) {
    if (this.selectedBezier) {
      const edge = this.selectedBezier.edge;
      delete edge.drawMiddlePoint;
      if (edge._lineWidth !== undefined) {
        edge.lineWidth = edge._lineWidth;
        delete edge._lineWidth;
      } else {
        delete edge.lineWidth;
      }
    }
    this.selectedBezier = b;

    if (b) {
      const edge = b.edge;
      edge.drawMiddlePoint = true;
      if (edge._lineWidth !== undefined) {
        edge._lineWidth = edge.lineWidth;
      }
      edge.lineWidth = 5;
    }
    if (this.selectedLabel) {
      this.deselectLabel();
    }

    if (this.onBezierSelect) {
      this.onBezierSelect(this.selectedBezier);
    }
    this.renderer.refreshIfNotMoving();
  }

  /*
  splitCurve() {
    if (!this.selectedBezier) {
      return;
    }

    const edge = this.selectedBezier.edge;

    this.graph.splitEdge(edge);
  }
  */
}
