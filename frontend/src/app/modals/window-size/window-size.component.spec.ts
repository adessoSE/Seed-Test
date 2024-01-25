import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindowSizeComponent } from './window-size.component';

describe('WindowSizeComponent', () => {
  let component: WindowSizeComponent;
  let fixture: ComponentFixture<WindowSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WindowSizeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindowSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
