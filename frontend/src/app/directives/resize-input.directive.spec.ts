import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';
import { ResizeInputDirective } from '../directives/resize-input.directive';
import {StoryEditorComponent } from '../story-editor/story-editor.component'
import { MockInstance, ngMocks, MockComponent } from 'ng-mocks';
import { By } from '@angular/platform-browser';


@Component({
  template: `
  <div #containerEl class="stepsContainer" style="width:500px">
    <div #parentEl class="text-inline SmallBody1regularLH stepLine">
      <div>
        <input appResizeInput class="background" 
        style="padding-left: 5px; padding-right: 5px;min-width: 100px"/>
      </div>
      <div>
        <input appResizeInput class="background" 
      style="padding-left: 5px; padding-right: 5px;min-width: 100px"/>
      </div> 
    </div>
  </div>`
})

class TestComponents { 
  
  minWidth;
  maxWidth;
}

describe('appResizeInputDirective',() => {
  let component: TestComponents;
  let fixture: ComponentFixture<TestComponents>;
  
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [],
      declarations: [ ResizeInputDirective, TestComponents],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('check number of inputs', () => {
    const inputs = fixture.debugElement.queryAll(By.css('.background'));
    expect(inputs.length).toEqual(2);
  });

  it('should input width to be 100px', waitForAsync(() => {
    const input = fixture.debugElement.query(By.css('.background'));
    fixture.whenStable().then(() => {
      expect(input.nativeElement.value).toEqual('');
      expect(input.nativeElement.width).toBeLessThanOrEqual(100);
    });   
  }));

  it('should fail', waitForAsync(() => {
    const input = fixture.debugElement.query(By.css('.background'));
    input.nativeElement.value = 'the input text should be long enough to make the input field wider';
    input.nativeElement.dispatchEvent(new Event('paste'));
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(input.nativeElement.width).toBeGreaterThan(100);
    });
  }));

  it('should change width with long space string', waitForAsync (() => {
    const input = fixture.debugElement.query(By.css('.background'));
    input.nativeElement.value = '                                                                                ';
    input.nativeElement.dispatchEvent(new Event('input'));
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(input.nativeElement.width).toBeGreaterThan(100);
    });
  }));
});
