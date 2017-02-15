import {IPoint, Point} from './point';

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

