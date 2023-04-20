import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component'
import { CreateCustomProjectComponent } from './create-custom-project.component';

describe('CreateCustomProjectComponent', () => {
  let component: CreateCustomProjectComponent;
  let fixture: ComponentFixture<CreateCustomProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateCustomProjectComponent, LayoutModalComponent ],
      imports: [HttpClientTestingModule, ToastrModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateCustomProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
