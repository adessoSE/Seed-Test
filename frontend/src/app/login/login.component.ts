import { Component, OnInit } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm} from '@angular/forms';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  repositories: string[];
  error: string;
  private testAccountName = 'adessoCucumber';
  private testAccountToken: string;

  constructor(public apiService: ApiService, public router: Router, private route: ActivatedRoute) {
        this.route.queryParams.subscribe((params) => {
          if(params.login){
            this.apiService.loginGihubToken(params.login, params.id).subscribe((resp) => {
              console.log(resp)
              this.apiService.getRepositories().subscribe((resp) => {
                this.repositories = resp;
              }, (err) => {
                this.error = err.error;
              });
            })
          }
        })
    }

  ngOnInit() {
  }

  async login(form: NgForm) {
    this.error = undefined;
    let user = await this.apiService.loginUser(form.value.email, form.value.password).toPromise()
    this.apiService.getRepositories().subscribe((resp) => {
      this.repositories = resp;
    }, (err) => {
      this.error = err.error;
    });

  }

  async loginTestAccount() {
    this.error = undefined;
    let user = await this.apiService.loginUser(null, null).toPromise()
      this.apiService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
      }, (err) => {
        this.error = err.error;
      });
  }

  selectRepository(userRepository: string) {
    localStorage.setItem('repository', userRepository);
    this.router.navigate(['/']);
  }

  githubLogin(){
    this.apiService.githubAuthentication()
 }
}
