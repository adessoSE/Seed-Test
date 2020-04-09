import { LoginComponent } from '../login/login.component';
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
