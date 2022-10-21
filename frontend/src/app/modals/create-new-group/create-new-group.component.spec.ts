import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component'
import { CreateNewGroupComponent } from './create-new-group.component';

describe('CreateNewGroupComponent', () => {
  let component: CreateNewGroupComponent;
  let fixture: ComponentFixture<CreateNewGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateNewGroupComponent, LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateNewGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
