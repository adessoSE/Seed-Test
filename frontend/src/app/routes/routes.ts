import { LoginComponent } from '../login/login.component';
import { ParentComponent } from '../parent/parent.component';
import { AuthGuard } from '../guards/auth.guard';

export const ROUTES = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: '',
        component: ParentComponent,
        canActivate: [AuthGuard]
    }
]
