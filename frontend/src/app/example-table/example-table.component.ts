import { Subscription } from 'rxjs';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import { Component, OnInit, Input, ElementRef, QueryList, ViewChildren, AfterViewInit, AfterViewChecked, ChangeDetectionStrategy, inject, output, input, viewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormArray, UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Scenario } from '@shared/models/Scenario';
import { NotificationService } from '../Services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../modals/confirm-dialog/confirm-dialog.component';
import { Story } from '@shared/models/Story';
import { StepType } from '@shared/models/StepType';
import { ExampleService } from '../Services/example.service';
import { ScenarioService } from '../Services/scenario.service';
import { ApiService } from '../Services/api.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDragHandle, CdkDrag } from '@angular/cdk/drag-drop';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { StepDefinition } from '@shared/models/StepDefinition';
import { ThemePalette } from '@angular/material/core';
import { ThemingService } from '../Services/theming.service';
import { HighlightInputService } from '../Services/highlight-input.service';
import { StepValidationService } from '../Services/step-validation.service';

import { MatSlideToggle } from '@angular/material/slide-toggle';
import { NewExampleComponent as NewExampleComponent_1 } from '../modals/new-example/new-example.component';

/**
 * Component of for the Example Table
 */
@Component({
    selector: 'app-example-table',
    templateUrl: './example-table.component.html',
    styleUrls: ['./example-table.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatTable, CdkDropList, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSlideToggle, FormsModule, ReactiveFormsModule, MatCellDef, MatCell, CdkDragHandle, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, CdkDrag, NewExampleComponent_1]
})
export class ExampleTableComponent implements OnInit, AfterViewInit, AfterViewChecked {
	scenarioService = inject(ScenarioService);
	private notify = inject(NotificationService);
	private dialog = inject(MatDialog);
	exampleService = inject(ExampleService);
	apiService = inject(ApiService);
	themeService = inject(ThemingService);
	highlightInputService = inject(HighlightInputService);
	stepValidationService = inject(StepValidationService);

	/**
   * Columns which are displayed in the table
   */
	displayedColumns: string[] = [];
	/**
   * Data of the table entries
   */
	data: Record<string, string>[] = [];

	/**
   * Control if dragging
   */
	dragDisabled = true;
	/**
   * Controls of the table
   */
	controls!: UntypedFormArray;

	/**
   * Last row to render add button
   */
	lastRow: any;

	/**
   * selected Scenario
   */
	selectedScenario!: Scenario;
	/**
   * toggle Edit table mode
   */
	color: ThemePalette = 'primary';
	toggleControl = new UntypedFormControl(false);
	editMode!: boolean;
	/**
   * Boolean if the example table should be shown or not
   */
	exampleThere: boolean = false;

	deleteExampleObservable!: Subscription;
	toggleObservable!: Subscription;
	updateExampleTableObservable!: Subscription;
	themeObservable!: Subscription;

	indexOfExampleToDelete!: number;
	readonly table = viewChild.required<MatTable<StepDefinition>>('table');

	/**
   * Event emitter to check if ththe example table should be removed or added to
   */
	readonly checkRowIndex = output<number>();

	/**
   * Sets the new scenario
   */
	@Input()
	set newSelectedScenario(scenario: Scenario) {
		this.selectedScenario = scenario;
		this.updateTable();
		this.initialRegex = true;
	}

	@Input() isDark!: boolean;

	readonly newExampleModal = viewChild.required<NewExampleComponent>('newExampleModal');

	/**
   * Event emitter to delete the example
   */
	readonly deleteExampleEvent = output<void>();

	regexInStory: boolean = false;
	initialRegex: boolean = true;
	targetOffset: number = 0;

	@ViewChildren('example_input') example_input!: QueryList<ElementRef>;

	/**
   * @ignore
   */
	ngOnInit() {
		this.deleteExampleObservable =
			this.exampleService.deleteExampleEvent.subscribe(() => {
				this.deleteExampleFunction();
			});
		//this.lastRow = this.selectedScenario.stepDefinitions.example.slice(-1)[0];
		this.updateExampleTableObservable =
			this.exampleService.updateExampleTableEvent.subscribe(() => {
				this.updateTable();
			});

		this.toggleObservable = this.toggleControl.valueChanges.subscribe((val) => {
			this.editMode = val;
			this.activateEditableValues();
		});

		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe(
			(_changedTheme) => {
				this.isDark = this.themeService.isDarkMode();
				this.regexHighlightOnInit();
			}
		);
	}

	// eslint-disable-next-line @angular-eslint/use-lifecycle-interface
	ngOnDestroy() {
		if (this.deleteExampleObservable && !this.deleteExampleObservable.closed) 
			this.deleteExampleObservable.unsubscribe();
    
		if (this.updateExampleTableObservable && !this.updateExampleTableObservable.closed) 
			this.updateExampleTableObservable.unsubscribe();
    
		if (this.themeObservable && !this.themeObservable.closed) 
			this.themeObservable.unsubscribe();
    
		if (this.toggleObservable && !this.toggleObservable.closed) 
			this.toggleObservable.unsubscribe();
    
	}

	ngAfterViewInit() {
		this.regexDOMChangesHelper();
		if (this.initialRegex) 
			this.regexHighlightOnInit();
    
	}

	ngAfterViewChecked() {
		this.regexDOMChangesHelper();
		if (this.initialRegex) 
			this.regexHighlightOnInit();
    
		this.activateEditableValues();
	}

	activateEditableValues(){
		const exampleValues = document.getElementsByClassName('exampleValueContainer editMode');
		if (exampleValues.length > 0) 
			for (let i = 0; i < exampleValues.length; i++) {
				const exampleValue = exampleValues[i] as HTMLElement;
				if (exampleValue) 
					if (this.editMode) 
						exampleValue.setAttribute('contenteditable', 'true');
					else 
						exampleValue.setAttribute('contenteditable', 'false');
					
				
			}
    
	}
	/**
   * Adds a value to every example
   */
	addRowToExamples() {
		const row = JSON.parse(
			JSON.stringify(this.selectedScenario.multipleScenarios![0])
		);
		row.values.forEach((value: string, index: number) => {
			row.values[index] = 'value';
		});
		this.selectedScenario.multipleScenarios!.push(row);
		this.updateTable();
		this.selectedScenario.saved = false;
	}
	/**
   * Initializes the controls of the table
   */
	initializeTableControls() {
		//let seen = new Set<string>();
		//this.selectedScenario.stepDefinitions.example[0].values.filter(item => {
		//    let k = item;
		//    return seen.has(k) ? false : seen.add(k);
		//});
		//this.selectedScenario.stepDefinitions.example[0].values = Array.from(seen);
		this.displayedColumns = [' '].concat(
			this.selectedScenario.multipleScenarios![0].values
		);
		const formArray: UntypedFormGroup[] = [];
		for (let i = 1; i < this.selectedScenario.multipleScenarios!.length; i++) {
			const toGroups = new UntypedFormGroup({}, { updateOn: 'blur' });
			for (let j = 0; j < this.selectedScenario.multipleScenarios![i].values.length; j++) {
				const cont1 = new UntypedFormControl(this.selectedScenario.multipleScenarios![i].values[j]);
				toGroups.addControl(this.selectedScenario.multipleScenarios![0].values[j], cont1);
			}
			formArray.push(toGroups);
		}
		this.controls = new UntypedFormArray(formArray);
	}

	/**
   * Initializes the data of the table
   */
	initializeTable() {
		this.data = [];
		for (let i = 1; i < this.selectedScenario.multipleScenarios!.length; i++) {
			const js: Record<string, string> = {};
			for (let j = 0; j < this.selectedScenario.multipleScenarios![i].values.length; j++)
				js[this.selectedScenario.multipleScenarios![0].values[j]] = this.selectedScenario.multipleScenarios![i].values[j];

			this.data.push(js);
		}
		this.regexHighlightOnInit();
	}

	/**
   * Updates a field of the table
   * @param columnIndex index of the column of the changed value
   * @param rowIndex index of the row of the changed value
   * @param column name of the changed value column
   */
	// updateField(columnIndex: number, rowIndex: number, column) {
	//   const control = this.getControl(rowIndex, column);
	//   if (control.valid) {
	//     const getCircularReplacer = () => {
	//       const seen = new WeakSet;
	//       return (key, value) => {
	//         if (typeof value === "object" && value !== null) {
	//           if (seen.has(value)) {
	//             return;
	//           }
	//           seen.add(value);
	//         }
	//         return value;
	//       };
	//     };
	//     let reference = JSON.parse(JSON.stringify(this.controls.at(rowIndex).get(column), getCircularReplacer()));
	//     this.selectedScenario.multipleScenarios[rowIndex + 1].values[columnIndex-1] = reference._pendingValue;
	//     this.initializeTable();
	//   } else {
	//     console.log('CONTROL NOT VALID');
	//   }
	//  }

	/**
   * Get the controls of a specific cell
   * @param rowIndex index of the row
   * @param fieldName name of the cell column
   * @returns FormControl of the cell
   */
	// getControl(rowIndex: number, fieldName: string): UntypedFormControl {
	//   this.selectedScenario.saved = false;
	//   return this.controls.at(rowIndex).get(fieldName) as UntypedFormControl;
	// }

	/**
   * Updates the table controls and data
   */
	updateTable() {
		if (this.selectedScenario.multipleScenarios![1]) {
			this.exampleThere = true;
			this.initializeTable();
			this.initializeTableControls();
			this.lastRow = this.selectedScenario.multipleScenarios!.slice(-1)[0];
			this.scenarioService.scenarioChangedEmitter();
		} else 
			this.exampleThere = false;
    
	}

	/**
   * Emits an event to check if the example table should be removed
   * @param event change event
   * @param rowIndex row index of the changed cell
   */
	checkExample(event: any, rowIndex: number) {
		this.checkRowIndex.emit(rowIndex + 1);
	}

	renameExample(columnIndex: number) {
		this.newExampleModal().openNewExampleModal(this.selectedScenario, 'rename', columnIndex - 1);
		// this.newExampleModal.renameExample(this.selectedScenario, columnIndex - 1);
		this.updateTable();
	}

	/**
   * Emitts the delete scenario event
   * @param event
   */
	deleteExample(event: any, columnIndex: number) {
		this.indexOfExampleToDelete = columnIndex - 1;
		this.deleteExampleEvent.emit();
		this.showDeleteExampleToast(event);
	}

	/**
   * Opens the delete example toast
   * @param scenario
   */
	showDeleteExampleToast(_scenario: Scenario) {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Delete variable?',
				message: 'Are you sure you want to delete this variable?',
				buttons: [
					{ label: 'Delete', value: 'delete', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'delete') this.exampleService.deleteExampleEmitter();
		});
	}

	deleteExampleFunction() {

		const oldName = this.selectedScenario.multipleScenarios![0].values[this.indexOfExampleToDelete];

		this.selectedScenario.multipleScenarios!.forEach((value, index) => {
			this.selectedScenario.multipleScenarios![index].values.splice(this.indexOfExampleToDelete, 1);
		});

		if (this.selectedScenario.multipleScenarios![0].values.length == 0)
			this.selectedScenario.multipleScenarios = [];


		this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
			value.values.forEach((val, i) => {
				if (val == '<' + oldName + '>') {
					this.selectedScenario.stepDefinitions.given[index].values[i] = '';
					this.selectedScenario.stepDefinitions.given[index].isExample![i] = false;
				}
			});
		});

		this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
			value.values.forEach((val, i) => {
				if (val == '<' + oldName + '>') {
					this.selectedScenario.stepDefinitions.when[index].values[i] = '';
					this.selectedScenario.stepDefinitions.when[index].isExample![i] = false;
				}
			});
		});

		this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
			value.values.forEach((val, i) => {
				if (val == '<' + oldName + '>') {
					this.selectedScenario.stepDefinitions.then[index].values[i] = '';
					this.selectedScenario.stepDefinitions.then[index].isExample![i] = false;
				}
			});
		});

		this.updateTable();
		this.selectedScenario.saved = false;
	}
	/**
   * Drag and drop an examples value
   * @param event
   */
	dropExample(event: CdkDragDrop<any>) {
		this.dragDisabled = true;
		const previousIndex = this.data.findIndex((d) => d === event.item.data);
		moveItemInArray(this.data, previousIndex, event.currentIndex);
		this.table().renderRows();
		this.replaceDragedValue();
		this.selectedScenario.saved = false;
	}
	/**
   * Change the order of rows
   */
	replaceDragedValue() {
		const newData: string[][] = [];
		this.data.forEach((row) => {
			const newRow: string[] = [];
			Object.keys(row).forEach((key) => {
				newRow.push(row[key]);
			});
			newData.push(newRow);
		});
		for (
			let i = 1;
			i < this.selectedScenario.multipleScenarios!.length;
			i++
		)
			this.selectedScenario.multipleScenarios![i].values = newData[i - 1];
    
	}

	/**
   * Add value and highlight regex, Style regex in value and add value in selectedScenario
   * Value is in textContent and style is in innerHTML
   * @param el HTML element of contentedible div
   * @param columnIndex index of changed value in values
   * @param rowIndex index of changed value in example
   * @param initialCall if call is from ngDoCheck
   */
	exampleNullValue!: boolean;

	private highlightRegex(el: HTMLElement, columnIndex: number | undefined, rowIndex: number | undefined, initialCall: boolean, element?: any, column?: string) {
		const inputValue: string = el.textContent;

		if (!initialCall) {
			this.selectedScenario.multipleScenarios![rowIndex! + 1].values[columnIndex! - 1] = inputValue;
			this.selectedScenario.saved = false;
		}
		if (!initialCall) 
			this.initialRegex = false;
    

		const regexDetected = this.highlightInputService.highlightInput(
			el,
			initialCall,
			this.isDark,
			this.regexInStory
		);

		if (initialCall && regexDetected) 
			this.regexInStory = true;
    
		if (element && column) 
			element[column] = inputValue;
    

	}


	/**
   * Helper for inital hightlighting
   */
	regexHighlightOnInit() {
		this.regexInStory = false;
		this.initialRegex = false;
		if (this.example_input) 
			this.example_input.forEach((in_field) => {
				this.highlightRegex(in_field.nativeElement, undefined, undefined, true);
			});
    
	}

	/**
   * Helper for DOM change subscription
   */
	regexDOMChangesHelper() {
		this.example_input.changes.subscribe((_) => { });
	}

	/**
   * Quote validation on blur events
   */
	onStepInputQuoteValidation(event: FocusEvent, _stepIndex?: number, _valueIndex?: number, _stepType?: string): void {
		const element = event.target as HTMLElement;
		const text = element.textContent || '';
    
		this.stepValidationService.validateAndShowQuoteWarning(text, element);
	}

}