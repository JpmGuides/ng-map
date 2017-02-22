import { Point, IPoint } from './point';
import { TripEdge } from './trip-edge';
import { TripGraph } from './trip-graph';
import { TripNode, TripNodeProperties, ITripNode } from './trip-node';
import { TripSaved } from './trip-saved';
import { TripGraphLayer } from './trip-graph-layer';

export class SeqTrip {
  private _tripData: TripSaved;

  constructor() {
    this.reset();
  }

  private static makePlaneIcon(verb: string, placeNode: TripNode): TripNode {
    const iconNode = new TripNode();
    iconNode.name = placeNode.name + '-' + verb,
    iconNode.labelIcon = {
        url: '/assets/plane.png',
        width: 20,
        autorotate: (Math.PI/2) * (verb === 'landing' ? 1 : -1)
    };
    iconNode.coord = placeNode.coord;
    iconNode.properties = {
        point: false,
        leaderLine: 'center',
        dashed: [5,3],
        leaderLineWidth: 2
    };
    return iconNode;
  }

  places(): TripNode[] {
    return this._tripData.places;
  }

  stages(): TripEdge[] {
    return this._tripData.stages;
  }

  width(): number { return this._tripData.width; }
  height(): number { return this._tripData.height; }

  setSize(width: number, height: number) {
    this._tripData.width = width;
    this._tripData.height = height;
  }

  reset() {
    this._tripData = {
      places: [],
      stages: [],
      additionalPlaces: [],
      location: { x: .5, y: .5, scale: 1 },
      defaultRadius: 8,
      width: 400,
      height: 400,
      world: undefined,
      defaultTextProp: { }
    };
  }


  replaceTrip(places: ITripNode[]) {
    this.reset();

    for (let i = 0; i < places.length; ++i) {
      const p = places[i];
      const n = new TripNode();
      n.coord = new Point(p.coord);
      n.name = '' + i;
      n.properties = { };

      const toCopy = ['labelIcon', 'label', 'properties', 'viewerPos'];
      for (let field of toCopy) {
        if (field in p) {
          n[field] = p[field];
        }
      }

      this._tripData.places.push(n);
    }

    this.generateStages();
    this.updateLandingsAndTakeoff();
  }

  private generateStages() {
    const places = this._tripData.places;
    const numStages = places.length - 1;
    this._tripData.stages = [];
    for (let i = 1; i <= numStages; ++i) {
      this._tripData.stages.push({
        from: '' + (i - 1),
        to: '' + i,
        controlPoints: TripGraph.generateControlPoints(
            (i >= 2 ? places[i - 2].coord : undefined),
            places[i - 1].coord,
            places[i].coord,
            ((i + 1) < places.length ? places[i + 1].coord : undefined)
            )
      });
    }
  }

  private updateLandingsAndTakeoff() {
    const index : { [key: string]: number } = { };
    const additionalPlaces = this._tripData.additionalPlaces;

    for (let i = 0; i < additionalPlaces.length; ++i) {
      index[additionalPlaces[i].name] = i;
    }

    const verbs = ['landing', 'takeoff'];

    for (let n of this._tripData.places) {
      for (let verb of verbs) {
        const name = n.name + '-' + verb;
        if (n.properties[verb]) {
          // landing/takeoff wanted
          if (!(name in index)) {
            additionalPlaces.push(SeqTrip.makePlaneIcon(verb, n));
          }
        } else {
          // landing/takeoff not wanted
          if (name in index) {
            additionalPlaces.splice(index[name], 1);
          }
        }
      }
    }
  }

  nodeRadius(node: TripNode, pixelRatio: number): number {
    let r = this._tripData.defaultRadius;
    if (node.properties && node.properties.radius) {
      r = node.properties.radius;
    }
    return r * pixelRatio;
  };

  makeGraph(tripLayer: TripGraphLayer): TripGraph {
    const graph = new TripGraph();

    const renameDict = {};
    const fuseNodePair = function(a, b) {
      const r = TripGraphLayer.shallowCopy(a);
      r.name = a.name + ',' + b.name;

      const labels = a.label.split('\n');
      if (labels.indexOf(b.label) < 0) {
        labels.push(b.label);
      }
      r.label = labels.join('\n');
      renameDict[a.name] = renameDict[b.name] = r.name;
      return r;
    };

    const lookup = function(name) {
      let r = name;
      while (r in renameDict) {
        r = renameDict[r];
      }
      return r;
    };

    const pinchZoom = tripLayer.renderer.pinchZoom;
    const pixelRatio = tripLayer.renderer.pixelRatio;

    for (let node of this._tripData.places) {
      node.viewerPos = pinchZoom.viewerPosFromWorldPos(node.coord);
    }

    const keptNodes = [];
    for (let node of this._tripData.places) {
      if (!node.label || (node.properties && node.properties.skip)) {
        continue;
      }

      const r = this.nodeRadius(node, pixelRatio);
      let keep = true;

      for (let i = 0; i < keptNodes.length; ++i) {
        const n = keptNodes[i];
        const dist = Point.dist(n.viewerPos, node.viewerPos);
        if (dist < (this.nodeRadius(n, pixelRatio) + r)) {
          keptNodes[i] = fuseNodePair(n, node);
          keep = false;
          break;
        }
      }
      if (keep) {
        if (!node.properties) {
          node.properties = {};
        }
        keptNodes.push({
          coord: node.coord,
          name: '' + node.name,
          label: node.label,
          labelIcon: node.labelIcon,
          properties: node.properties,
          viewerPos: node.viewerPos,
          place: node
        });
      }
    }

    const result = new TripGraph();

    for (let n of keptNodes) {
      result.nodes[n.name] = n;
    }

    this.updateLandingsAndTakeoff();
    for (let n of this._tripData.additionalPlaces) {
      result.nodes[n.name] = n;
    }

    const places = this._tripData.places;

    for (let edge of this._tripData.stages) {
      if (edge.hidden || places[parseInt(edge.from, 10)].isSkipped()) {
        continue;
      }
      const nameFrom = lookup('' + edge.from);

      let to = parseInt(edge.to, 10);
      while (to < places.length && places[to].isSkipped()) {
        ++to;
      }
      if (places[to].isSkipped()) {
        continue;
      }
      const nameTo = lookup('' + to);

      if (nameFrom !== nameTo) {
        const newEdge = TripGraphLayer.shallowCopy(edge);
        newEdge.from = nameFrom;
        newEdge.to = nameTo;
        newEdge.originalEdge = edge;
        result.edges.push(newEdge);
      }
    }
    return result;
  }

}

