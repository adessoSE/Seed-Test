import { DebugElement } from "@angular/core";
import { ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

export function findComponent<T>(
    fixture: ComponentFixture<T>,
    selector: string,
  ): DebugElement {
    return fixture.debugElement.query(By.css(selector));
}