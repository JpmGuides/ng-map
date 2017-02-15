import { Component, Input, Output, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ColorPickerService, Hsva, Rgba } from 'angular2-color-picker';

import { TripNodeProperties } from '../trip-map/trip-node';

import {IPoint, Point} from '../trip-map/point';

@Component({
  selector: 'text-prop',
  templateUrl: 'text-prop.component.html',
  styleUrls: ['./text-prop.component.css']
})
export class TextPropComponent implements OnInit {
  @Input() @Output() properties: TripNodeProperties;
  @Input() title: string;

  private _textColor: string;
  private _shadowColor: string;

  constructor(private cpService: ColorPickerService) {
  }

  ngOnInit() { }

  ngOnChanges() {
    this._textColor = '#000000';
    if (this.properties && this.properties.fill) {
      this._textColor = this.properties.fill;
    }
    this._shadowColor = 'rgba(255,255,255,.5)';

    if (this.properties && this.properties.stroke) {
      this._shadowColor = this.properties.stroke;
    }
  }

  ngAfterViewInit() {
  }

  contrastedColor(c: string) {
    const hsv: Hsva = this.cpService.stringToHsva(c);
    if (hsv) {
      hsv.v = (hsv.v < .5 ? 1 : 0);
      hsv.a = 1;
      return this.cpService.outputFormat(hsv, '', false);
    } else {
      return '#000000';
    }
  }

  colorChanged(id: string) {
    const prop = {
      _shadowColor: 'stroke',
      _textColor: 'fill'
    };

    this.properties[prop[id]] = this[id];
  }
}
