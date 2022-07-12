import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { RepoSwichComponent } from './repo-swich.component';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

const repositories: RepositoryContainer[] = [{_id: '1', value: 'myFirstRepo', source: 'db', canEdit: true},
{_id: '2', value: 'githubRepo', source: 'github', canEdit: true},
{_id: '', value: 'jiraRepo', source: 'jira', canEdit: true}]

describe('RepoSwichComponent', () => {
  let component: RepoSwichComponent;
  let fixture: ComponentFixture<RepoSwichComponent>;
  let modalService: NgbModal;
  let modalReference: NgbModalRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoSwichComponent, LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach( () => {
    let store = {};
    const mockLocalStorage = {
      getItem: (key: string): string => {
        return key in store ? store[key] : null;
      },
      setItem: (key: string, value: string) => {
        store[key] = `${value}`;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };
    fixture = TestBed.createComponent(RepoSwichComponent);
    modalService = TestBed.inject(NgbModal);
    component = fixture.componentInstance;
    mockLocalStorage.setItem('repositories', JSON.stringify(repositories));
    component.openModal();
    jest.spyOn(modalService,'open');
    jest.spyOn(sessionStorage, 'getItem').mockImplementation((key) => mockLocalStorage.getItem(key));
    jest.spyOn(sessionStorage, 'setItem').mockImplementation((key, value) => mockLocalStorage.setItem(key, value));
    jest.spyOn(sessionStorage, 'removeItem').mockImplementation((key) => mockLocalStorage.removeItem(key));
    jest.spyOn(sessionStorage, 'clear').mockImplementation(() => mockLocalStorage.clear());
    fixture.detectChanges();
  });

  it('should create', fakeAsync(() => {
    expect(component).toBeTruthy();
  }));
});
