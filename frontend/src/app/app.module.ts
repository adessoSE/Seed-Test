import {BrowserModule} from '@angular/platform-browser';
import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ROUTES} from '../app/routes/routes';
import {AppComponent} from './app.component';
import {ScenarioEditorComponent} from './scenario-editor/scenario-editor.component';
import {HttpClientModule} from '@angular/common/http';
import {SafePipe} from './safe.pipe';
import {ApiService} from './Services/api.service';
import {StoriesBarComponent} from './stories-bar/stories-bar.component';
import {ParentComponent} from './parent/parent.component';
import {LoginComponent} from './login/login.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthGuard} from './guards/auth.guard';
import {MatTableModule} from '@angular/material';
import {ExampleTableComponent} from './example-table/example-table.component';
import {EditableComponent} from './editable/editable.component';
import {ViewModeDirective} from './editable/view-mode.directive';
import {EditModeDirective} from './editable/edit-mode.directive';
import {EditableOnEnterDirective} from './editable/edit-on-enter.directive';
import {FocusableDirective} from './example-table/focusable.directive';
import {DragDropModule} from '@angular/cdk/drag-drop';

import { FeedbackComponent } from './feedback/feedback.component';
import { TermsComponent } from './terms/terms.component';

@NgModule({
  declarations: [
    AppComponent,
    ScenarioEditorComponent,
    SafePipe,
    StoriesBarComponent,
    ParentComponent,
    LoginComponent,
    ExampleTableComponent,
    ViewModeDirective,
    EditModeDirective,
    EditableComponent,
    FocusableDirective,
    EditableOnEnterDirective,
    FeedbackComponent,
    TermsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatTableModule,
    RouterModule.forRoot(ROUTES),
    FormsModule,
    DragDropModule
  ],
  providers: [ApiService, AuthGuard],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
