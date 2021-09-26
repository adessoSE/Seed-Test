import { LoginComponent } from '../login/login.component';
import {AccountManagementComponent} from '../account-management/account-management.component';
import { ParentComponent } from '../parent/parent.component';
import { AuthGuard } from '../guards/auth.guard';
import { FeedbackComponent } from '../feedback/feedback.component';
import { TermsComponent } from '../terms/terms.component';
import { TestAccountComponent } from '../test-account/test-account.component';
import { RegistrationComponent } from '../registration/registration.component';
import { ReportComponent } from '../report/report.component';
import { ResetPasswordComponent } from '../reset-password/reset-password.component';
import { ConfirmResetPasswordComponent }  from '../confirm-reset-password/confirm-reset-password.component';

/**
 * All routs of the system
 */
export const ROUTES = [
    /**
     * Login
     */
    {
        path: 'login',
        component: LoginComponent
    },

    /**
     * Account Management
     */
    {
        path: 'accountManagement',
        component: AccountManagementComponent
    },

    /**
     * Parent Component with Story editor
     */
    {
        path: '',
        component: ParentComponent,
        canActivate: [AuthGuard]
    },

    /**
     * Reports
     */
    {
        path: 'report/:reportName',
        component: ReportComponent
    },

    /**
     * Testaccount
     */
    {
        path: 'testaccount',
        component: TestAccountComponent
    },

    /**
     * Feedback
     */
    {
        path: 'feedback',
        component: FeedbackComponent
    },

    /**
     * Terms
     */
    {
        path: 'terms',
        component: TermsComponent
    },

    /**
     * Register
     */
    {
        path: 'register',
        component: RegistrationComponent
    },

    /**
     * Reset password
     */
    {
        path: 'resetpassword',
        component: ResetPasswordComponent
    },

    /**
     * Confirm the new password
     */
    {
        path: 'resetpasswordconfirm',
        component: ConfirmResetPasswordComponent
    },

    {
        path: 'story/:story_id',
        component: ParentComponent
    },

    {
        path: 'story/:story_id/:scenario_id',
        component: ParentComponent
    },

];
