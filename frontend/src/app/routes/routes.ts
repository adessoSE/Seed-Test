import { LoginComponent } from "../login/login.component";
import { ParentComponent } from "../parent/parent.component";

export const ROUTES = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: '',
        component: ParentComponent
    }
]