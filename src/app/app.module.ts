import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import {ColorPickerModule} from 'angular2-color-picker';

import { AppComponent } from './app.component';
import { TripMapComponent } from './trip-map/trip-map.component';
import { TextPropComponent } from './text-prop/text-prop.component';

import { ButtonsModule } from 'ng2-bootstrap/buttons';
import { AccordionModule } from 'ng2-bootstrap/accordion';
import { TabsModule } from 'ng2-bootstrap/tabs';

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
    ColorPickerModule,
    AccordionModule.forRoot(),
    ButtonsModule.forRoot(),
    TabsModule.forRoot(),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
