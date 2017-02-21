export interface IPoint {
  x: number;
  y: number;
};

export class Point implements IPoint {
  x: number;
  y: number;

  static minus(a: IPoint, b: IPoint) { return new Point(a.x - b.x, a.y - b.y); };
  static plus(a: IPoint, b: IPoint) { return new Point(a.x + b.x, a.y + b.y); };
  static times(t: number, a: IPoint) { return new Point(t * a.x, t * a.y); };
  static min(a: Point, b: Point) {
    return new Point(Math.min(a.x, b.x), Math.min(a.y, b.y));
  };
  static max(a: IPoint, b: IPoint) {
    return new Point(Math.max(a.x, b.x), Math.max(a.y, b.y));
  };

  static dist(a: IPoint, b: IPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  static norm(a: IPoint): number { return Math.sqrt(a.x * a.x + a.y * a.y); };

  static nearest(target: IPoint, points: Point[]): Point {
    let best;
    let bestDist;
    for (let p of points) {
      const dist = Point.dist(p, target);
      if (best === undefined || dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    return best;
  };

  constructor(x: IPoint | number[] | number, y?: number) {
    if (typeof(x) === 'number' && typeof(y) === 'number') {
      this.x = x;
      this.y = y;
    } else if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else if (typeof(x) === 'object') {
      this.x = x.x;
      this.y = x.y;
    }
    if (this.x === undefined || this.y === undefined) {
      throw(new Error('invalid point'));
    }
  }

  add(p: IPoint) { this.x += p.x; this.y += p.y; return this; };
  sub(p: IPoint) { this.x -= p.x; this.y -= p.y; return this; };
  mul(t: number) { this.x *= t; this.y *= t; return this; };

  norm(): number { return Point.norm(this); };
};

