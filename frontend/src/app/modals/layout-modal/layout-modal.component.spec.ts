import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutModalComponent } from './layout-modal.component';

describe('LayoutModalComponent', () => {
  let component: LayoutModalComponent;
  let fixture: ComponentFixture<LayoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
