import {BrowserModule} from '@angular/platform-browser';
import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ROUTES} from '../app/routes/routes';
import {AppComponent} from './app.component';
import {ScenarioEditorComponent} from './scenario-editor/scenario-editor.component';
import {HttpClientModule} from '@angular/common/http';
import {ApiService} from './Services/api.service';
import {StoriesBarComponent} from './stories-bar/stories-bar.component';
import {ParentComponent} from './parent/parent.component';
import {LoginComponent} from './login/login.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthGuard} from './guards/auth.guard';
import {MatTableModule} from '@angular/material';
import {ExampleTableComponent} from './example-table/example-table.component';
import {EditableComponent} from './editable/editable.component';
import {ViewModeDirective} from './directives/view-mode.directive';
import {EditModeDirective} from './directives/edit-mode.directive';
import {EditableOnEnterDirective} from './directives/edit-on-enter.directive';
import {FocusableDirective} from './example-table/focusable.directive';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { FeedbackComponent } from './feedback/feedback.component';
import { TermsComponent } from './terms/terms.component';
import { SubmitformComponent } from './submitform/submitform.component';
import { StoryEditorComponent } from './story-editor/story-editor.component';
import { AccountManagmentComponent } from './account-managment/account-managment.component';
import { LoginFormComponent } from './login-form/login-form.component';
import {CookieService } from 'ngx-cookie-service';
import { TestAccountComponent } from './test-account/test-account.component'

@NgModule({
  declarations: [
    AppComponent,
    ScenarioEditorComponent,
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
    TermsComponent,
    SubmitformComponent,
    StoryEditorComponent,
    AccountManagmentComponent,
    LoginFormComponent,
    TestAccountComponent
  ],
  imports: [
      NgbModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatTableModule,
    RouterModule.forRoot(ROUTES),
    FormsModule,
    DragDropModule
  ],
  providers: [ApiService, AuthGuard, CookieService],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
