import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { RepoSwichComponent } from './repo-swich.component';


const repositories: RepositoryContainer[] = [{_id: '1', value: 'myFirstRepo', source: 'db', canEdit: true},
{_id: '2', value: 'githubRepo', source: 'github', canEdit: true},
{_id: '', value: 'jiraRepo', source: 'jira', canEdit: true}]

describe('RepoSwichComponent', () => {
  let component: RepoSwichComponent;
  let fixture: ComponentFixture<RepoSwichComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoSwichComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoSwichComponent);
    component = fixture.componentInstance;
    sessionStorage.setItem('repositories', JSON.stringify(repositories));
    fixture.detectChanges();
  });

  it('should create', fakeAsync(() => {
    expect(component).toBeTruthy();
  }));
});
