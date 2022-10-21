import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component'
import { ChangeJiraAccountComponent } from './change-jira-account.component';

describe('ChangeJiraAccountComponent', () => {
  let component: ChangeJiraAccountComponent;
  let fixture: ComponentFixture<ChangeJiraAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeJiraAccountComponent, LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeJiraAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
