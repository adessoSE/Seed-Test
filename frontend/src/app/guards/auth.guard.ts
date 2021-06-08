import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiService } from '../Services/api.service';

/**
 * Guard to check if the user is logged in
 */
@Injectable()
export class AuthGuard implements CanActivate {

    /**
     * Constructor
     * @param apiService 
     * @param router 
     */
    constructor(private apiService: ApiService,
                private router: Router) {}

    /**
     * Checks if the user is logged in
     * @returns boolean if the user is logged in
     */
    canActivate(): boolean {
        if (this.apiService.isLoggedIn()) { return true; }
        this.router.navigate(['/login']);
        return false;
    }
}
