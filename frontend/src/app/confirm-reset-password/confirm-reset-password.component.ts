import { Component} from '@angular/core';
import { NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-confirm-reset-password',
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.css']
})
export class ConfirmResetPasswordComponent {
 
  uuid: string;
  password: string; 

 
  constructor(public apiService: ApiService, private router: Router, private route: ActivatedRoute) {
    this.route.queryParams.subscribe((params) => {
      if (params.uuid){
           this.uuid = params.uuid;
       }
   })
  }

  confirmReset(form : NgForm) {
    this.apiService.confirmReset(this.uuid, form.value.password).toPromise()
    this.router.navigate(['/login']);
  }

}
