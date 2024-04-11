import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../Services/login.service';

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
