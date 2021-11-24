import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkgroupEditComponent } from './workgroup-edit.component';

describe('WorkgroupEditComponent', () => {
  let component: WorkgroupEditComponent;
  let fixture: ComponentFixture<WorkgroupEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorkgroupEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkgroupEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
