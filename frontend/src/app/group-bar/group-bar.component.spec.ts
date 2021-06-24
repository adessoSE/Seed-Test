import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupBarComponent } from './group-bar.component';

describe('GroupBarComponent', () => {
  let component: GroupBarComponent;
  let fixture: ComponentFixture<GroupBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupBarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
