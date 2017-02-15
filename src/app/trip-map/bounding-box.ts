
import { Point, IPoint } from './point';

export class BoundingBox {
  min?: Point;
  max?: Point;

  static closestPoint(point: Point, bbox: BoundingBox) {
    const r = new Point(0, 0);

    for (const i in r) {
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

  static overlaps(a: BoundingBox, b: BoundingBox): boolean {
    if (a.max.x < b.min.x // a is left of b
        || a.min.x > b.max.x // a is right of b
        || a.max.y < b.min.y // a is above b
        || a.min.y > b.max.y) { // a is below b
      return false;
    }
    return true; // boxes overlap
  }

  static contains(box: BoundingBox, p: IPoint): boolean {
    return ((p.x >= box.min.x) && (p.x <= box.max.x)
            && (p.y >= box.min.y) && (p.y <= box.max.y));
  }

  addPoint(p: Point) {
    this.min = (this.min === undefined ? p : Point.min(this.min, p));
    this.max = (this.max === undefined ? p : Point.max(this.max, p));
  }

  addArray(a: Point[]) {
    for (const p of a) {
      this.addPoint(p);
    }
  }

  overlaps(other: BoundingBox): boolean {
    return BoundingBox.overlaps(this, other);
  }

  contains(p: IPoint): boolean { return BoundingBox.contains(this, p); }
}
