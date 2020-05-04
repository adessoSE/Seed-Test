import { LoginComponent } from '../login/login.component';
import {AccountManagmentComponent} from '../account-managment/account-managment.component';
import { ParentComponent } from '../parent/parent.component';
import { AuthGuard } from '../guards/auth.guard';
import { FeedbackComponent } from '../feedback/feedback.component';
import { TermsComponent } from '../terms/terms.component';
import { TestAccountComponent } from '../test-account/test-account.component';
import { RegistrationComponent } from '../registration/registration.component';

export const ROUTES = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'accountManagment',
        component: AccountManagmentComponent
    },
    {
        path: '',
        component: ParentComponent,
        canActivate: [AuthGuard]
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
