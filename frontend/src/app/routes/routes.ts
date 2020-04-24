import { LoginComponent } from '../login/login.component';
import {AccountManagmentComponent} from '../account-managment/account-managment.component';
import { ParentComponent } from '../parent/parent.component';
import { AuthGuard } from '../guards/auth.guard';
import { FeedbackComponent } from '../feedback/feedback.component';
import { TermsComponent } from '../terms/terms.component';

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
        path: 'feedback',
        component: FeedbackComponent
    },
    {
        path: 'terms',
        component: TermsComponent
    }
];
