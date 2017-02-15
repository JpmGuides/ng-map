import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TripGraph } from './trip-graph';
import { TripGraphLayer } from './trip-graph-layer';
import { TripNode, TripNodeProperties } from './trip-node';

import {IPoint, Point} from './point';

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


declare class WorldBackgroundLayer {
  constructor (parameters: {
    renderer: CanvasTilesRenderer;
    onCountryClic: (country: {id: string}) => void;
    onSeaClic: () => void;
  });
};

declare class TripGraphEditor {
  graph: TripGraph;
  onLabelSelect: (node: TripNode) => void;

  constructor (renderer: CanvasTilesRenderer, graph: TripGraph);
};

@Component({
  selector: 'trip-map',
  templateUrl: 'trip-map.component.html',
  styleUrls: ['./trip-map.component.css']
})
export class TripMapComponent implements OnInit {

  private _canvasWidth: Number;
  private _canvasHeight: Number;
  private _renderer: CanvasTilesRenderer;
  private _worldLayer: WorldBackgroundLayer;
  private _tripLayer: TripGraphLayer;
  private _editor: TripGraphEditor;

  private _graph: TripGraph;
  private _selectedNode: TripNode;
  private _selectedCountry: string;

  private _editedProperties: TripNodeProperties;
  private _editedPropertiesTitle: string;
  private _autoRefresh: number;

  @ViewChild('mapCanvas') canvas: ElementRef;

  constructor() {
    this._canvasWidth = 256;
    this._canvasHeight = 256;
    this._selectedCountry = '';
    this._graph = new TripGraph();
  }

  ngOnInit() {
    this._graph = TripGraph.createFromStopovers(
[
  {'name': 'Bremerhaven', 'label': 'Bremerhaven', 'coord': new Point([0.52382425, 0.3231958936276962])},
  {'name': 'Svolvær', 'label': 'Svolvær', 'coord': new Point([0.5404676111111111, 0.2375687007931659])},
  {'name': 'Svolvær', 'label': 'Svolvær', 'coord': new Point([0.5404676111111111, 0.2375687007931659])},
  {'name': 'Stokmarknes', 'label': 'Stokmarknes', 'coord': new Point([0.5414187500000001, 0.23507522492215238])},
  {'name': 'Stokmarknes', 'label': 'Stokmarknes', 'coord': new Point([0.5414187500000001, 0.23507522492215238])},
  {'name': 'Honningsvåg', 'label': 'Honningsvåg', 'coord': new Point([0.5721399166666666, 0.21562953617976272])},
  {'name': 'Honningsvåg', 'label': 'Honningsvåg', 'coord': new Point([0.5721399166666666, 0.21562953617976272])},
  {'name': 'Tromsø', 'label': 'Tromsø', 'coord': new Point([0.5526530000000001, 0.2266278992534943])},
  {'name': 'Tromsø', 'label': 'Tromsø', 'coord': new Point([0.5526530000000001, 0.2266278992534943])},
  {'name': 'Bodø', 'label': 'Bodø', 'coord': new Point([0.5400139166666666, 0.24457168612111502])},
  {'name': 'Bodø', 'label': 'Bodø', 'coord': new Point([0.5400139166666666, 0.24457168612111502])},
  {'name': 'Namsos', 'label': 'Namsos', 'coord': new Point([0.5319325555555555, 0.26371411496742947])},
  {'name': 'Namsos', 'label': 'Namsos', 'coord': new Point([0.5319325555555555, 0.26371411496742947])},
  {'name': 'Åndalsnes', 'label': 'Åndalsnes', 'coord': new Point([0.5213530277777778, 0.2755465584709916])},
  {'name': 'Åndalsnes', 'label': 'Åndalsnes', 'coord': new Point([0.5213530277777778, 0.2755465584709916])},
  {'name': 'Ålesund', 'label': 'Ålesund', 'coord': new Point([0.517097, 0.27611988382949165])},
  {'name': 'Ålesund', 'label': 'Ålesund', 'coord': new Point([0.517097, 0.27611988382949165])},
  {'name': 'Søgne', 'label': 'Søgne', 'coord': new Point([0.5216192777777777, 0.3007003117937194])},
  {'name': 'Bergen', 'label': 'Bergen', 'coord': new Point([0.5147893055555556, 0.28820327330752726])},
  {'name': 'Bergen', 'label': 'Bergen', 'coord': new Point([0.5147893055555556, 0.28820327330752726])},
  {'name': 'Lyngdal', 'label': 'Lyngdal', 'coord': new Point([0.5196389444444445, 0.30046723926901475])},
  {'name': 'Lyngdal', 'label': 'Lyngdal', 'coord': new Point([0.5196389444444445, 0.30046723926901475])},
  {'name': 'Bremerhaven', 'label': 'Bremerhaven', 'coord': new Point([0.52382425, 0.3231958936276962])}]
);
}

  ngAfterViewInit() {
    this._renderer = new CanvasTilesRenderer({
      canvas: this.canvas.nativeElement,
      url: 'https://tiles.wmflabs.org/bw-mapnik/$scale/$x/$y.png',
      initialLocation: { x: 0.5196633492226737, y: 0.2519760172389177, scale: 0.0814}
    });

    this._worldLayer = new WorldBackgroundLayer({
      renderer: this._renderer,
      onCountryClic: (country) => { this.selectCountry(country.id); },
      onSeaClic: () => { this.selectCountry(''); }
    });
    this._renderer.layers[0] = this._worldLayer;

    this._tripLayer = new TripGraphLayer({
      renderer: this._renderer,
      graph: this._graph
    });
    this._renderer.addLayer(this._tripLayer);

    this._tripLayer.loadIcons((err) => { this._renderer.refresh(); });

    // setTimeout is necessary to restart an angular check cycle.
    // In ngAfterViewInit, we're not supposed to change the state.
    setTimeout(() => {
      this.clearSelection();
      this._editor = new TripGraphEditor(this._renderer, this._graph);
      this._renderer.pinchZoom.touchEventHandlers.push(this._editor);

      this._editor.onLabelSelect = (node: TripNode) => {
        this.selectCountry();
        this.selectNode(node);
      };
    }, 10);

    this._autoRefresh = setInterval(
      () => { this._renderer.refreshIfNotMoving(); }, 500);
  }

  ngOnDestroy() {
    if (this._autoRefresh) {
      clearInterval(this._autoRefresh);
    }
  }

  clearSelection() {
    this._selectedCountry = undefined;
    this._selectedNode = undefined;
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
    }
  }

  nodeNames(): string[] {
    return Object.keys(this._graph.nodes);
  }

  setFrame(width?: number, height?: number) {
    const canvas = this._renderer.canvas;
    const w = width || canvas.width;
    const h = height || canvas.height;
    this._renderer.setLocation(this._graph.location(w / h, 1.2));
  }

  placeLabels() {
    this._tripLayer.graph = this._tripLayer.makeFusedGraph(this._graph);
    this._editor.graph = this._tripLayer.graph;
    this._tripLayer.placeLabels(this._renderer.canvas.getContext('2d'));
    this._renderer.refresh();
  };

  update() {
    this.setFrame();
    this.placeLabels();
  }

  resetCurves() {
    const graph = this._graph;
    const tripLayer = this._tripLayer;

    graph.createDefaultBezier();
    tripLayer.graph = tripLayer.makeFusedGraph(graph);
    this._editor.graph = tripLayer.graph;

    tripLayer.placeLabels(this._renderer.canvas.getContext('2d'));
    this._renderer.refresh();
  }
}
