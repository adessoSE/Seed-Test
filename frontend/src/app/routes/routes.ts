import { LoginComponent } from '../login/login.component';
import {AccountManagementComponent} from '../account-management/account-management.component';
import { ParentComponent } from '../parent/parent.component';
import { AuthGuard } from '../guards/auth.guard';
import { FeedbackComponent } from '../feedback/feedback.component';
import { TermsComponent } from '../terms/terms.component';
import { TestAccountComponent } from '../test-account/test-account.component';
import { RegistrationComponent } from '../registration/registration.component';
import { ReportComponent } from '../report/report.component';

export const ROUTES = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'accountManagement',
        component: AccountManagementComponent
    },
    {
        path: '',
        component: ParentComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'report/:reportName',
        component: ReportComponent
    },
    {
        path: 'testaccount',
        component: TestAccountComponent
    },
    {
        path: 'feedback',
        component: FeedbackComponent
    },
    {
        path: 'terms',
        component: TermsComponent
    },
    {
        path: 'register',
        component: RegistrationComponent
    }
];
