import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { RepoSwichComponent } from './repo-swich.component';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

jest.mock('./repo-swich.component');


const repositories: RepositoryContainer[] = [{_id: '1', repoName: 'myFirstRepo', source: 'db', canEdit: true},
{_id: '2', repoName: 'githubRepo', source: 'github', canEdit: true},
{_id: '', repoName: 'jiraRepo', source: 'jira', canEdit: true}]


describe('RepoSwichComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach( () => {
  });

  it('should create', fakeAsync(() => {
    //
  }));
});
