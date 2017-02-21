import { Point } from './point';

export interface TripEdge {
  from: string;
  to: string;
  controlPoints: Point[];
  hidden?: boolean;
  drawMiddlePoint?: boolean;
  lineColor?: string;
  lineWidth?: number;
  _lineWidth?: number; // used as backup when selecting an edge
  originalEdge?: TripEdge;
}
