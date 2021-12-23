import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoSwichComponent } from './repo-swich.component';

describe('RepoSwichComponent', () => {
  let component: RepoSwichComponent;
  let fixture: ComponentFixture<RepoSwichComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RepoSwichComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoSwichComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
