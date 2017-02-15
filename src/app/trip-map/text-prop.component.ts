import { Component, Input, Output, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TripNodeProperties } from './trip-node';

import {IPoint, Point} from './point';

@Component({
  selector: 'text-prop',
  templateUrl: 'text-prop.component.html',
  styleUrls: ['./text-prop.component.css']
})
export class TextPropComponent implements OnInit {
  @Input() @Output() properties: TripNodeProperties;

  constructor() {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }
}
