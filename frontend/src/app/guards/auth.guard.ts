import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../Services/login.service';


/** TODO: canActivate is deprecated and was removed from Angular 15.2 and above - we might need to adjust the AuthGuard!
 * As of now, it seems that you can login and do things; but might be dysfunctional!
 */
/**
 * Guard to check if the user is logged in
 */
@Injectable()
export class AuthGuard  {

    /**
     * Constructor
     * @param loginService 
     * @param router 
     */
    constructor(private loginService: LoginService,
                private router: Router) {}

    /**
     * Checks if the user is logged in
     * @returns boolean if the user is logged in
     */
    canActivate(): boolean {
        if (this.loginService.isLoggedIn()) { return true; }
        this.router.navigate(['/login']);
        return false;
    }
}
