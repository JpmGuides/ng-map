import { Point } from './point';

export class TripEdge {
  from: string;
  to: string;
  controlPoints: Point[];
  hidden?: boolean;
  drawMiddlePoint?: boolean;
  lineColor?: string;
  lineWidth?: number;
}
