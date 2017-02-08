import * as Tiles from './tiles';

export interface TripSaved {
  graph: TripGraph;
  location: Tiles.Location;
  defaultRadius: number;
  defaultTextProp: any;
  width: number;
  height: number;
  world: any;
}

