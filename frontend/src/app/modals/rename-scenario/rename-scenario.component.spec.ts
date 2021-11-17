import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenameScenarioComponent } from './rename-scenario.component';

describe('RenameScenarioComponent', () => {
  let component: RenameScenarioComponent;
  let fixture: ComponentFixture<RenameScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameScenarioComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
