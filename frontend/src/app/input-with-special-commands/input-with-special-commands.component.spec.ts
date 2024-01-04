import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputWithSpecialCommandsComponent } from './input-with-special-commands.component';

describe('InputWithSpecialCommandsComponent', () => {
  let component: InputWithSpecialCommandsComponent;
  let fixture: ComponentFixture<InputWithSpecialCommandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputWithSpecialCommandsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputWithSpecialCommandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
