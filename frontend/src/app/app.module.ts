import {BrowserModule} from '@angular/platform-browser';
import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ROUTES} from '../app/routes/routes';
import {AppComponent} from './app.component';
import {ScenarioEditorComponent} from './scenario-editor/scenario-editor.component';
import {HttpClientModule, HTTP_INTERCEPTORS} from '@angular/common/http';
import {ApiService} from './Services/api.service';
import {StoriesBarComponent} from './stories-bar/stories-bar.component';
import {ParentComponent} from './parent/parent.component';
import {LoginComponent} from './login/login.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthGuard} from './guards/auth.guard';
import {MatTableModule} from '@angular/material/table';
import {MatListModule} from '@angular/material/list';
import {ExampleTableComponent} from './example-table/example-table.component';
import {EditableComponent} from './editable/editable.component';
import {ViewModeDirective} from './directives/view-mode.directive';
import {EditModeDirective} from './directives/edit-mode.directive';
import {EditableOnEnterDirective} from './directives/edit-on-enter.directive';
import {FocusableDirective} from './editable/focusable.directive';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { FeedbackComponent } from './feedback/feedback.component';
import { TermsComponent } from './terms/terms.component';
import { StoryEditorComponent } from './story-editor/story-editor.component';
import { AccountManagementComponent } from './account-management/account-management.component';
import {CookieService } from 'ngx-cookie-service';
import { TestAccountComponent } from './test-account/test-account.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { ReportComponent } from './report/report.component';
import { RegistrationComponent } from './registration/registration.component';
import { PasswordConfirmedValidatorDirective } from './directives/password-confirmed.directive';
import { ToastrModule } from 'ngx-toastr';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { MatCarouselModule } from '@ngbmodule/material-carousel';
import {RunTestToast} from './runSave-toast';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ConfirmResetPasswordComponent } from './confirm-reset-password/confirm-reset-password.component';
import { ModalsComponent } from './modals/modals.component'
import { DeleteScenarioToast } from './deleteScenario-toast';
import { DEFAULT_TIMEOUT, TimeoutInterceptor } from './Services/timeout-interceptor.interceptor';
import { ReportHistoryComponent } from './report-history/report-history.component';

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
    AccountManagementComponent,
    TestAccountComponent,
    StoryEditorComponent,
    RegistrationComponent,
    RegistrationComponent,
    PasswordConfirmedValidatorDirective,
    ReportComponent,
    RunTestToast,
    DeleteScenarioToast,
    ResetPasswordComponent,
    ConfirmResetPasswordComponent,
    ModalsComponent,
    ReportHistoryComponent,
  ],
  imports: [
      NgbModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatTableModule,
    MatListModule,
    RouterModule.forRoot(ROUTES),
    FormsModule,
    DragDropModule,
    MatProgressSpinnerModule,
    MatCarouselModule.forRoot(),
    ToastrModule.forRoot({
      timeOut: 3000
    })
  ],
  entryComponents: [RunTestToast],
  providers: [ApiService, AuthGuard, CookieService, [{ provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true }], [{ provide: DEFAULT_TIMEOUT, useValue: 120000 }]],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
