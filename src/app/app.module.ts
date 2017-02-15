import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import {ColorPickerModule} from 'angular2-color-picker';

import { AppComponent } from './app.component';
import { TripMapComponent } from './trip-map/trip-map.component';
import { TextPropComponent } from './text-prop/text-prop.component';

@NgModule({
  declarations: [
    AppComponent,
    TripMapComponent,
    TextPropComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ColorPickerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
