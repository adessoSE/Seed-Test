import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { ApiService } from "../services/api.service";


@Injectable()
export class AuthGuard implements CanActivate{

    constructor(private apiService: ApiService,
                private router: Router){}

    canActivate(): boolean{
        if(this.apiService.isLoggedIn()) return true
        this.router.navigate(['/login'])
        return false;
    }
    
}