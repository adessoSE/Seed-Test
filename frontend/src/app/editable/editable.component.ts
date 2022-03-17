import { Component, ContentChild, ElementRef, EventEmitter,
   Output, OnInit, OnDestroy } from '@angular/core';
import { ViewModeDirective } from '../directives/view-mode.directive';
import { EditModeDirective } from '../directives/edit-mode.directive';
import { fromEvent, Subject } from 'rxjs';
import { filter, take, switchMapTo } from 'rxjs/operators';
import { untilDestroyed } from '@ngneat/until-destroy';

/**
 * Component to enable editable cells in the example table
 */
@Component({
  selector: 'editable',
  templateUrl: './editable.component.html',
  styleUrls: ['./editable.component.css']
})

export class EditableComponent implements OnInit, OnDestroy {
  @ContentChild(ViewModeDirective) viewModeTpl: ViewModeDirective;
  @ContentChild(EditModeDirective) editModeTpl: EditModeDirective;
  @Output() update = new EventEmitter();

  editMode = new Subject();
  editMode$ = this.editMode.asObservable();

  mode: 'view' | 'edit' = 'view';

  /**
   * @ignore
   */
  constructor(private host: ElementRef) {}

  /**
   * handles the edit and view mode on init
   */
  ngOnInit() {
    this.viewModeHandler();
    this.editModeHandler();
  }

  /**
   * @ignore
   */
  ngOnDestroy() {}

  /**
   * Changes to the view mode
   */
  toViewMode() {
    this.update.emit();
    this.mode = 'view';
  }

  /**
   * Gets the native element
   */
  private get element() {
    return this.host.nativeElement;
  }

  /**
   * handles the view mode
   */
  private viewModeHandler() {
    fromEvent(this.element, 'dblclick').pipe(
      untilDestroyed(this)
    ).subscribe(() => {
      this.mode = 'edit';
      this.editMode.next(true);
    });
  }

  /**
   * Handles the edit mode
   */
  private editModeHandler() {
    const clickOutside$ = fromEvent(document, 'click').pipe(
      filter(({ target }) => this.element.contains(target) === false),
      take(1)
    );
    this.editMode$.pipe(
      switchMapTo(clickOutside$),
      untilDestroyed(this)
    ).subscribe(event => this.toViewMode());
  }

  /**
   * Gets the current mode
   */
  get currentView() {
    return this.mode === 'view' ? this.viewModeTpl.tpl : this.editModeTpl.tpl;
  }
}
