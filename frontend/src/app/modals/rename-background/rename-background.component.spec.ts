import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule } from 'ngx-toastr';

import { RenameBackgroundComponent } from './rename-background.component';

describe('RenameBackgroundComponent', () => {
  let component: RenameBackgroundComponent;
  let fixture: ComponentFixture<RenameBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RenameBackgroundComponent ],
      imports: [HttpClientTestingModule, RouterTestingModule, ToastrModule.forRoot()],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RenameBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
