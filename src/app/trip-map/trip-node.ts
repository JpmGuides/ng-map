import {Point, IPoint } from './point';
import { BoundingBox } from './bounding-box';

export interface TripNodeProperties {
  point?: boolean;
  leaderLine?: string;
  dashed?: number[];
  leaderLineWidth?: number;
  labelBbox?: BoundingBox;
  radius?: number;
  leaderLineAnchor?: Point;
  labelColor?: string;
  labelCoord?: Point;
  frame?: string;
  leaderLineColor?: string;
  fontSize?: number;
  font?: string;
  stroke?: string;
  haloWidth?: number;
  fill?: string;
  textOffset?: number;
  textPlacement?: string;
  skip?: boolean;
}

export interface ITripNode {
  coord: IPoint | number[];
  name?: string;
  label?: string;
  labelIcon?: {
    url: string;
    width?: number;
    height?: number;
    autorotate?: number;
    angle?: number;
  };
  properties?: TripNodeProperties;

  viewerPos?: Point;
  place?: TripNode;
}

export class TripNode implements ITripNode {
  coord: Point;
  name?: string;
  label?: string;
  labelIcon?: {
    url: string;
    width?: number;
    height?: number;
    autorotate?: number;
    angle?: number;
  };
  properties?: TripNodeProperties;

  viewerPos?: Point;
  place?: TripNode;

  isSkipped():boolean {
    if (this.label
        && (!this.properties || this.properties.skip === undefined)) {
      return false;
    }
    return this.properties.skip;
  }
}
