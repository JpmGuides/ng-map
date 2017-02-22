import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { TripGraph } from './trip-graph';
import { TripGraphEditor } from './trip-graph-editor';
import { TripGraphLayer } from './trip-graph-layer';
import { TripNode, TripNodeProperties } from './trip-node';
import { TripEdge } from './trip-edge';
import { IPoint, Point } from './point';
import { SeqTrip } from './seq-trip';

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


declare class WorldBackgroundLayer {
  constructor (parameters: {
    renderer: CanvasTilesRenderer;
    onCountryClic: (country: {id: string}) => void;
    onSeaClic: () => void;
  });
};

class PageSize {

  constructor(
    public name: string,
    public width_mm: number,
    public height_mm: number) { }

  static mmToPoint = 2.83465;
  widthPt() { return Math.floor(this.width_mm * PageSize.mmToPoint); }
  heightPt() { return Math.floor(this.height_mm * PageSize.mmToPoint); }
  key(): string { return this.width_mm + 'x' + this.height_mm; }
};

@Component({
  selector: 'trip-map',
  templateUrl: 'trip-map.component.html',
  styleUrls: ['./trip-map.component.css'],
})
export class TripMapComponent implements OnInit {

  private _canvasWidth: number;
  private _canvasHeight: number;
  private _renderer: CanvasTilesRenderer;
  private _worldLayer: WorldBackgroundLayer;
  private _tripLayer: TripGraphLayer;
  private _editor: TripGraphEditor;

  private _graph: TripGraph;
  private _selectedNode: TripNode;
  private _selectedCountry: string;
  private _selectedEdge: TripEdge;

  private _editedProperties: TripNodeProperties;
  private _editedPropertiesTitle: string;
  private _autoRefresh: number;

  private _visitedPlaceList: TripNode[];
  private _stages: TripEdge[];
  private _seqTrip: SeqTrip;

  _pageSizes : PageSize[];
  _pageSizeName : string;
  _pageSizeMap: { [key: string] : PageSize };

  @ViewChild('mapCanvas') canvas: ElementRef;

  constructor() {
    this._canvasWidth = 512;
    this._canvasHeight = 512;
    this._selectedCountry = '';
    this._graph = new TripGraph();
    this._seqTrip = new SeqTrip();
    this._pageSizes = [
      new PageSize("A5 landscape", 210, 148),
      new PageSize("A5 portrait", 148, 210),
      new PageSize("A6 landscape", 105, 74),
      new PageSize("A6 portrait", 74, 105),
    ];
    this._pageSizeMap = {};
    for (let s of this._pageSizes) {
      this._pageSizeMap[s.key()] = s;
    }
    this.setPageSize(this._pageSizes[0].key());

    this._seqTrip.replaceTrip([
      { 'label': 'Bremerhaven', 'coord': [0.52382425, 0.3231958936276962]},
      { 'label': 'Svolvær', 'coord': [0.5404676111111111, 0.2375687007931659]},
      { 'label': 'Stokmarknes', 'coord': [0.5414187500000001, 0.23507522492215238]},
      { 'label': 'Honningsvåg', 'coord': [0.5721399166666666, 0.21562953617976272]},
      { 'label': 'Tromsø', 'coord': [0.5526530000000001, 0.2266278992534943]},
      { 'label': 'Bodø', 'coord': [0.5400139166666666, 0.24457168612111502]},
      { 'label': 'Namsos', 'coord': [0.5319325555555555, 0.26371411496742947]},
      { 'label': 'Åndalsnes', 'coord': [0.5213530277777778, 0.2755465584709916]},
      { 'label': 'Ålesund', 'coord': [0.517097, 0.27611988382949165]},
      { 'label': 'Søgne', 'coord': [0.5216192777777777, 0.3007003117937194]},
      { 'label': 'Bergen', 'coord': [0.5147893055555556, 0.28820327330752726]},
      { 'label': 'Lyngdal', 'coord': [0.5196389444444445, 0.30046723926901475]},
      { 'label': 'Bremerhaven', 'coord': [0.52382425, 0.3231958936276962]}]);

    this._visitedPlaceList = this._seqTrip.places();

    this._stages = this._seqTrip.stages();
  }

  destination(edge: TripEdge): TripNode {
    return this._seqTrip.places()[parseInt(edge.to, 10)];
  }
  origin(edge: TripEdge): TripNode {
    return this._seqTrip.places()[parseInt(edge.from, 10)];
  }

  ngOnInit() {
  }
 
  pixelRatio() : number {
    if (this._renderer && this._renderer.pixelRatio) {
      return this._renderer.pixelRatio;
    }
    return 1;
  }

  ngAfterViewInit() {
    this._renderer = new CanvasTilesRenderer({
      canvas: this.canvas.nativeElement,
      url: 'https://tiles.wmflabs.org/bw-mapnik/$scale/$x/$y.png',
      initialLocation: { x: 0.5196633492226737, y: 0.2519760172389177, scale: 0.0814}
    });

    this._worldLayer = new WorldBackgroundLayer({
      renderer: this._renderer,
      onCountryClic: (country) => {
        this._editor.deselectLabel();
        this.selectCountry(country.id);
      },
      onSeaClic: () => {
        this._editor.deselectLabel();
        this.selectCountry('');
      }
    });
    this._renderer.layers[0] = this._worldLayer;

    this._tripLayer = new TripGraphLayer({
      renderer: this._renderer,
      graph: this._graph
    });
    this._renderer.addLayer(this._tripLayer);

    // setTimeout is necessary to restart an angular check cycle.
    // In ngAfterViewInit, we're not supposed to change the state.
    setTimeout(() => {
      this.clearSelection();
      this._editor = new TripGraphEditor(this._renderer, this._graph);
      this._renderer.pinchZoom.touchEventHandlers.push(this._editor);

      this._editor.onLabelSelect = (node: TripNode) => {
        this.selectNode(node);
      };
      this._editor.onBezierSelect = (bezier: {edge: TripEdge}) => {
        if (bezier) {
          this.selectEdge(bezier.edge);
        } else {
          this.clearSelection();
        }
      };

      if (1) {
        this.reset(); // resets zoom and translation
      } else {
        this.recreate();  // keep existing location
      }

    }, 10);

    this._autoRefresh = setInterval(
      () => { this._renderer.refreshIfNotMoving(); }, 1000);
  }

  ngOnDestroy() {
    if (this._autoRefresh) {
      clearInterval(this._autoRefresh);
    }
  }

  clearSelection() {
    this._selectedCountry = undefined;
    this._selectedNode = undefined;
    this._selectedEdge = undefined;
    this._editedProperties = this._tripLayer.defaultTextProp;
    this._editedPropertiesTitle = 'Default';
  }

  selectCountry(country?: string) {
    this.clearSelection();
    this._selectedCountry = country;
  }

  selectNode(node: TripNode) {
    this.clearSelection();

    if (node) {
      if (!node.properties) {
        node.properties = { };
      }
      if (node.name in this._graph.nodes) {
        this._editedProperties = node.properties;
        this._editedPropertiesTitle = node.name;
        this._selectedNode = this._graph.nodes[node.name];
      } else {
        // this node is probably a combined one.
        this._editedProperties = node.properties;
        this._editedPropertiesTitle = 'Multi-line';
      }
      if (node !== this._editor.selectedLabel) {
        const savedCallback = this._editor.onLabelSelect;
        const savedBezierCallback = this._editor.onBezierSelect;
        this._editor.onLabelSelect = () => {};
        this._editor.onBezierSelect = () => {};
        if (node.name in this._editor.graph.nodes) {
          this._editor.selectLabel(node);
        } else {
          this._editor.deselectLabel();
        }
        this._editor.onLabelSelect = savedCallback;
        this._editor.onBezierSelect = savedBezierCallback;
      }
    }
  }

  selectEdge(edge: TripEdge) {
    this.clearSelection();
    this._selectedEdge = edge;
  }

  nodeNames(): string[] {
    return Object.keys(this._graph.nodes);
  }

  nodeArray(): TripNode[] {
    const r: TripNode[] = [];
    for (let k of Object.keys(this._graph.nodes)) {
      r.push(this._graph.nodes[k]);
    }
    return r;
  }

  isSkipped(node: TripNode): boolean {
    if (!node.properties || node.properties.skip === undefined) {
      return false;
    }
    return node.properties.skip;
  }

  toggleHideEdge(edge: TripEdge) {
    if (edge.hidden) {
      delete edge.hidden;
    } else {
      edge.hidden = true;
    }
    //this.recreate();
  }

  toggleSkipNode(node: TripNode) {
    if (this.isSkipped(node)) {
      delete node.properties.skip;
    } else {
      if (!node.properties) {
        node.properties = { skip: true };
      } else {
        node.properties.skip = true;
      }
    }
    //this.recreate();
  }

  toggleProperty(node: TripNode, property: string) {
    node.properties[property] = !node.properties[property];
  }

  removeEdge(edge: TripEdge) {
    const compareEdges =
      (e: TripEdge) => e.from !== edge.from || e.to !== edge.to;

    this._graph.edges = this._graph.edges.filter(compareEdges);
    this._editor.graph.edges = this._editor.graph.edges.filter(compareEdges);
  }

  setFrame(width?: number, height?: number) {
    if (!this._renderer) {
      return;
    }
    const canvas = this._renderer.canvas;
    const w = width || canvas.width;
    const h = height || canvas.height;
    this._renderer.setLocation(this._graph.location(w / h, 1.2));
  }

  placeLabels() {
    this._tripLayer.placeLabels(this._renderer.canvas.getContext('2d'));
    this._renderer.refresh();
  };

  update() {
    this.placeLabels();
  }

  resetCurves() {
    const graph = this._graph;

    graph.createDefaultBezier();
    this._tripLayer.graph = this._tripLayer.makeFusedGraph(graph);
    this._editor.graph = this._tripLayer.graph;

    this._tripLayer.placeLabels(this._renderer.canvas.getContext('2d'));
    this._renderer.refresh();
  }

  recreate() {
    this._tripLayer.graph = this._graph = this._editor.graph =
      this._seqTrip.makeGraph(this._tripLayer);
    this._tripLayer.loadIcons((err) => { this._renderer.refresh(); });

    this.placeLabels();
  }

  reset() {
    this._tripLayer.graph = this._graph = this._editor.graph =
      this._seqTrip.makeGraph(this._tripLayer);
    this._tripLayer.loadIcons((err) => { this._renderer.refresh(); });
    this.setFrame();
    this.placeLabels();
  }

  setPageSize(pageSizeName: string) {
    const pageSize = this._pageSizeMap[pageSizeName];
    if (pageSize) {
      this._pageSizeName = pageSizeName;
      this._canvasWidth = pageSize.widthPt();
      this._canvasHeight = pageSize.heightPt();
      this._seqTrip.setSize(this._canvasWidth, this._canvasHeight);
      this.setFrame(this._canvasWidth, this._canvasHeight);
      setTimeout(() => { this.placeLabels(); }, 20);
    }
  }
}
