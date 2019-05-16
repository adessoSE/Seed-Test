import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router'
import { ROUTES } from '../app/routes/routes'
import { AppComponent } from './app.component';
import { ScenarioEditorComponent} from './scenario-editor/scenario-editor.component';
import {HttpClientModule} from "@angular/common/http";
import { SafePipe } from './safe.pipe';
import { ApiService } from './Services/api.service';
import { StoriesBarComponent } from './stories-bar/stories-bar.component';
import { ParentComponent } from './parent/parent.component';
import { LoginComponent } from './login/login.component';
import { FormsModule } from '@angular/forms'

@NgModule({
  declarations: [
    AppComponent,
    ScenarioEditorComponent,
    SafePipe,
    StoriesBarComponent,
    ParentComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(ROUTES),
    FormsModule
  ],
  providers: [ApiService],
  bootstrap: [AppComponent],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
