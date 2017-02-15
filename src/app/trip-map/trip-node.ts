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
};

export interface TripNode {
  coord: Point;
  name: string;
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
}
