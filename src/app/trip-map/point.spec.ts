/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { Point } from './point';

describe('Point', () => {
  it('should sum two points', () => {
    let p1 = new Point(3, 4);
    let s = Point.plus(p1, {x:-3, y: -4});
    expect(s.x).toBe(0);
    expect(s.y).toBe(0);
  });
});
