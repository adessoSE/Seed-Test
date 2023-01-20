import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrModule, ToastrService} from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { StoryService } from './story.service';

describe('StoryService', () => {
  let service: StoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],

    });
    service = TestBed.inject(StoryService);
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
      const toast =TestBed.inject(ToastrService);
      const service: StoryService = new StoryService(apiService,http, toast);
      expect(service).toBeTruthy();
    });
  });
});
