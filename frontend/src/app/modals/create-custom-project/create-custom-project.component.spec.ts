import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCustomProjectComponent } from './create-custom-project.component';

describe('CreateCustomProjectComponent', () => {
  let component: CreateCustomProjectComponent;
  let fixture: ComponentFixture<CreateCustomProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateCustomProjectComponent ]
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
