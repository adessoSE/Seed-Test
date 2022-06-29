import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { ToastrModule, ToastrService } from 'ngx-toastr';


describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, ToastrModule.forRoot()],
  });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
  });

    afterEach(() => {
      sessionStorage.removeItem('url_backend');
    });

   /*  describe('create', () => {
      it('should be created', () => {
        const http: HttpClient = TestBed.inject(HttpClient);
        const toastr = new ToastrService('success');
        const service: ApiService = new ApiService(http, toastr);
        expect(service).toBeTruthy();
      });
    }); */

  });