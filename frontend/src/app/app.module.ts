import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ScenarioEditorComponent} from './scenario-editor/scenario-editor.component';
import {HttpClientModule} from "@angular/common/http";
import { SafePipe } from './safe.pipe';
import { ApiService } from './Services/api.service';


@NgModule({
  declarations: [
    AppComponent,
    ScenarioEditorComponent,
    SafePipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
