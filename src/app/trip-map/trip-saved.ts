import * as Tiles from './tiles';
import { TripGraph } from './trip-graph';
import { TripNode, TripNodeProperties } from './trip-node';
import { TripEdge } from './trip-edge';

export interface TripSaved {
  places: TripNode[];
  stages: TripEdge[];
  location: Tiles.Location;
  defaultRadius: number;
  defaultTextProp: any;
  width: number;
  height: number;
  world: any;
}

