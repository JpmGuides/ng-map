export interface IPoint {
  x: number;
  y: number;
};

export class Point implements IPoint {
  x: number;
  y: number;

  constructor(x : IPoint | number[] | number, y? : number) {
    if (typeof(x) == 'number' && typeof(y) == 'number') {
      this.x = x;
      this.y = y;
    } else if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else if (typeof(x) == 'object') {
      this.x = x.x;
      this.y = x.y;
    }
    if (this.x == undefined || this.y == undefined) {
      throw(new Error('invalid point'));
    }
  }

  static minus(a : IPoint, b : IPoint) { return new Point(a.x - b.x, a.y - b.y); };
  static plus(a : IPoint, b : IPoint) { return new Point(a.x + b.x, a.y + b.y); };
  static times(t : number, a : IPoint) { return new Point(t * a.x, t * a.y); };
  static min(a : Point, b : Point) {
    return new Point(Math.min(a.x, b.x), Math.min(a.y, b.y));
  };
  static max(a : IPoint, b : IPoint) {
    return new Point(Math.max(a.x, b.x), Math.max(a.y, b.y));
  };

  add(p : IPoint) { this.x += p.x; this.y += p.y; return this; };
  sub(p : IPoint) { this.x -= p.x; this.y -= p.y; return this; };
  mul(t : number) { this.x *= t; this.y *= t; return this; };

  static dist(a : IPoint, b : IPoint) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  static norm(a : IPoint) : number { return Math.sqrt(a.x * a.x + a.y * a.y); };

  norm() : number { return Point.norm(this); };
};

