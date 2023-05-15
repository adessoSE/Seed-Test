import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrModule} from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { ScenarioService } from './scenario.service';

describe('ScenarioService', () => {
  let service: ScenarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],

    });
    service = TestBed.inject(ScenarioService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
  });
  afterEach(() => {
    sessionStorage.removeItem('url_backend');
  });

  describe('create', () => {
    it('should be created', () => {
      const http: HttpClient = TestBed.inject(HttpClient);
      const apiService =TestBed.inject(ApiService);
      const service: ScenarioService = new ScenarioService(apiService,http);
      expect(service).toBeTruthy();
    });
  });
});
