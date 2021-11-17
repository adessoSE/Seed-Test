import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBlockFormComponent } from './add-block-form.component';

describe('AddBlockFormComponent', () => {
  let component: AddBlockFormComponent;
  let fixture: ComponentFixture<AddBlockFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddBlockFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddBlockFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
