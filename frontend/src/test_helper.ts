import { DebugElement } from "@angular/core";
import { ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

export function findComponent<T>(
    fixture: ComponentFixture<T>,
    selector: string,
  ): DebugElement {
    return fixture.debugElement.query(By.css(selector));
}

export function findElements (element: DebugElement, selector: string)  {
  return element.nativeElement.querySelectorAll(selector);
}

export function findElement (element: DebugElement, selector: string)  {
  return element.nativeElement.querySelector(selector);
}