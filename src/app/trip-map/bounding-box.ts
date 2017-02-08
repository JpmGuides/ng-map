
import { Point, IPoint } from './point';

export class BoundingBox {
  min?: Point;
  max?: Point;

  addPoint(p : Point) {
    this.min = (this.min == undefined ? p : Point.min(this.min, p));
    this.max = (this.max == undefined ? p : Point.max(this.max, p));
  }

  addArray(a : Point[]) {
    for (let p of a) {
      this.addPoint(p);
    }
  }

  static closestPoint(point : Point, bbox : BoundingBox) {
    var r = new Point(0, 0);

    for (var i in r) {
      if (point[i] < bbox.min[i]) {
        r[i] = bbox.min[i];
      } else if (point[i] > bbox.max[i]) {
        r[i] = bbox.max[i];
      } else {
        r[i] = point[i];
      }
    }
    return r;
  };

  overlaps(other : BoundingBox) : boolean {
    return BoundingBox.overlaps(this, other);
  }

  static overlaps(a : BoundingBox, b: BoundingBox) : boolean {
    if (a.max.x < b.min.x) return false; // a is left of b
    if (a.min.x > b.max.x) return false; // a is right of b
    if (a.max.y < b.min.y) return false; // a is above b
    if (a.min.y > b.max.y) return false; // a is below b
    return true; // boxes overlap
  }

  contains(p : IPoint) : boolean { return BoundingBox.contains(this, p); }

  static contains(box : BoundingBox, p: IPoint) : boolean {
    return ((p.x >= box.min.x) && (p.x <= box.max.x)
            && (p.y >= box.min.y) && (p.y <= box.max.y));
  }

}

