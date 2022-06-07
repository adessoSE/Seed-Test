import {BrowserModule} from '@angular/platform-browser';
import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ROUTES} from './routes/routes';
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
import { CarouselModule } from 'ngx-owl-carousel-o';
import {RunTestToast} from './runSave-toast';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ConfirmResetPasswordComponent } from './confirm-reset-password/confirm-reset-password.component';
import { DeleteScenarioToast } from './deleteScenario-toast';
import { DeleteStoryToast } from './deleteStory-toast';
import { DeleteRepositoryToast } from './deleteRepository-toast';
import { DEFAULT_TIMEOUT, TimeoutInterceptor } from './Services/timeout-interceptor.interceptor';
import {HttpLoggerInterceptor} from "./Services/http-logger.interceptor";
import { ReportHistoryComponent } from './report-history/report-history.component';
import {ClipboardModule} from '@angular/cdk/clipboard';
import { LoggerModule, NgxLoggerLevel } from "ngx-logger";
import { ThemingService } from './Services/theming.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';


import {MatSelectModule} from '@angular/material/select';
import { LayoutModalComponent } from './modals/layout-modal/layout-modal.component';
import { CreateNewGroupComponent } from './modals/create-new-group/create-new-group.component';
import { CreateCustomProjectComponent } from './modals/create-custom-project/create-custom-project.component';
import { DeleteAccountComponent } from './modals/delete-account/delete-account.component';
import { AddBlockFormComponent } from './modals/add-block-form/add-block-form.component';
import { SaveBlockFormComponent } from './modals/save-block-form/save-block-form.component';
import { NewStepRequestComponent } from './modals/new-step-request/new-step-request.component';
import { RenameScenarioComponent } from './modals/rename-scenario/rename-scenario.component';
import { RenameStoryComponent } from './modals/rename-story/rename-story.component';
import { WorkgroupEditComponent } from './modals/workgroup-edit/workgroup-edit.component';
import { CreateNewStoryComponent } from './modals/create-new-story/create-new-story.component';
import { UpdateGroupComponent } from './modals/update-group/update-group.component';
import { ChangeJiraAccountComponent } from './modals/change-jira-account/change-jira-account.component';
import { RepoSwichComponent } from './modals/repo-swich/repo-swich.component';
import {MatExpansionModule} from '@angular/material/expansion';
import { CreateScenarioComponent } from './modals/create-scenario/create-scenario.component';
import { ResizeInputDirective } from './resize-input.directive';

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
    DeleteStoryToast,
    DeleteRepositoryToast,
    ResetPasswordComponent,
    ConfirmResetPasswordComponent,
    ReportHistoryComponent,
    LayoutModalComponent,
    CreateNewGroupComponent,
    CreateCustomProjectComponent,
    DeleteAccountComponent,
    AddBlockFormComponent,
    SaveBlockFormComponent,
    NewStepRequestComponent,
    RenameScenarioComponent,
    RenameStoryComponent,
    WorkgroupEditComponent,
    CreateNewStoryComponent,
    UpdateGroupComponent,
    ChangeJiraAccountComponent,
    RepoSwichComponent,
    CreateScenarioComponent,
    ResizeInputDirective,
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
    MatSelectModule,
    RouterModule.forRoot(ROUTES),
    FormsModule,
    ClipboardModule,
    DragDropModule,
    MatProgressSpinnerModule,
    CarouselModule,
    HttpClientModule,
    LoggerModule.forRoot({
      level: NgxLoggerLevel.DEBUG
    }),
    ToastrModule.forRoot({
      timeOut: 3000
    }),
    MatSlideToggleModule,
    MatIconModule,
    MatExpansionModule,
  ],
  entryComponents: [RunTestToast],
  providers: [ApiService, AuthGuard, CookieService,
    [{ provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true }], [{ provide: HTTP_INTERCEPTORS, useClass: HttpLoggerInterceptor, multi: true }],
    [{ provide: DEFAULT_TIMEOUT, useValue: 120000 }], ThemingService],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
