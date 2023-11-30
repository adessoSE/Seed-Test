import { Subscription } from 'rxjs';
import { DeleteToast } from './../delete-toast';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { UntypedFormGroup, UntypedFormArray, UntypedFormControl } from '@angular/forms';
import { Scenario } from '../model/Scenario';
import { ToastrService } from 'ngx-toastr';
import { Story } from '../model/Story';
import { StepType } from '../model/StepType';
import { ExampleService } from '../Services/example.service';
import { ScenarioService } from '../Services/scenario.service';
import { ApiService } from '../Services/api.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatTable } from '@angular/material/table';
import { StepDefinition } from '../model/StepDefinition';
import { ThemePalette } from '@angular/material/core';
import { ThemingService } from '../Services/theming.service';


@Component({
  selector: 'app-example',
  template: `<app-base-editor [templateName]="TEMPLATE_NAME" [testRunning]="testRunning" [newlySelectedScenario]="selectedScenario"
  [newlySelectedStory]="selectedStory" [originalStepTypes]="originalStepTypes"></app-base-editor>
  `,
  styleUrls: ['./example-table.component.css'],
  
})

/* Example component */
export class ExampleComponent{

  selectedScenario;

  selectedStory;

  @Input() originalStepTypes: StepType[];

  @Input() templateName: string;

  /**
    * If the test is running
    */
  @Input() testRunning: boolean;

  /**
    * Sets a new selected story
    */
  @Input()
  set newlySelectedStory(story: Story) {
    this.selectedStory = story;
  }

  /**
    * Sets a new selected scenaio
    */
  @Input()
  set newlySelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
  }

  readonly TEMPLATE_NAME ='example';

}


/**
 * Component of for the Example Table
 */
@Component({
  selector: 'app-example-table',
  templateUrl: './example-table.component.html',
  styleUrls: ['./example-table.component.css']
})
export class ExampleTableComponent implements OnInit {

  /**
   * Columns which are displayed in the table
   */
  displayedColumns: string[] = [];
  /**
   * Data of the table entries
   */
  data = [];

  /**
   * Control if dragging
   */
  dragDisabled = true;
  /**
   * Controls of the table
   */
  controls: UntypedFormArray;

  /**
   * Last row to render add button
   */
  lastRow

  /**
   * selected Scenario
   */
  selectedScenario: Scenario;
  /**
   * toggle Edit table mode
   */
  color: ThemePalette = 'primary';
  toggleControl = new UntypedFormControl(false);
  editMode: boolean;
  /**
   * Boolean if the example table should be shown or not
   */
  exampleThere: boolean = false;

  deleteExampleObservable: Subscription;
  toggleObservable: Subscription;
  updateExampleTableObservable: Subscription;
  themeObservable: Subscription;

  indexOfExampleToDelete;
  @ViewChild('table') table: MatTable<StepDefinition>;

  /**
   * Event emitter to check if ththe example table should be removed or added to
   */
  @Output()
  checkRowIndex: EventEmitter<number> = new EventEmitter();

  /**
   * Sets the new scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    this.updateTable();
  }

  @Input() isDark: boolean;

  @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;

  /**
    * Event emitter to delete the example
    */
  @Output()
  deleteExampleEvent: EventEmitter<Scenario> = new EventEmitter();

  regexInStory: boolean = false;
  initialRegex: boolean = true;
  targetOffset: number = 0;

  @ViewChildren('example_input') example_input: QueryList<ElementRef>;

    /**
   * @ignore
   */
     constructor( public scenarioService: ScenarioService,
       private toastr: ToastrService,
       public exampleService: ExampleService,
       public apiService: ApiService,
       public themeService: ThemingService

       ) {}

     /**
    * @ignore
    */
  ngOnInit() {
    this.deleteExampleObservable = this.exampleService.deleteExampleEvent.subscribe(() => {this.deleteExampleFunction();});
    //this.lastRow = this.selectedScenario.stepDefinitions.example.slice(-1)[0];
    this.updateExampleTableObservable = this.exampleService.updateExampleTableEvent.subscribe(() =>{this.updateTable();});

    this.toggleObservable = this.toggleControl.valueChanges.subscribe(val => {
      this.editMode = val;
    });
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe((changedTheme) => {
      this.isDark = this.themeService.isDarkMode();
      this.regexHightlightOnInit();
  });
  }
 
  // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
  ngOnDestroy() {
    if (!this.deleteExampleObservable.closed) {
      this.deleteExampleObservable.unsubscribe();
    }
    if (!this.updateExampleTableObservable.closed) {
      this.updateExampleTableObservable.unsubscribe();
    }
    if (!this.themeObservable.closed) {
      this.themeObservable.unsubscribe();
    }
  }

  ngDoCheck(){
    if(this.initialRegex){
      this.regexHightlightOnInit();
    }
  }

  /**
    * Adds a value to every example
    */
  addRowToExamples(){
    let row = JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions.example[0]))
      row.values.forEach((value, index) => {
        row.values[index] = 'value'
      });
      this.selectedScenario.stepDefinitions.example.push(row)
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
    this.displayedColumns = [" "].concat(this.selectedScenario.stepDefinitions.example[0].values);
    const formArray: UntypedFormGroup[] = [];
    for (let i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++) {
      let toGroups = new UntypedFormGroup({},{updateOn: 'blur'});
      for (let j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ) {
        let cont1 = new UntypedFormControl(this.selectedScenario.stepDefinitions.example[i].values[j]);
        toGroups.addControl(this.selectedScenario.stepDefinitions.example[0].values[j], cont1);

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
    for (let i = 1 ; i < this.selectedScenario.stepDefinitions.example.length; i++) {
      let js= {};
      for (let j = 0; j < this.selectedScenario.stepDefinitions.example[i].values.length; j++ ) {
        js[this.selectedScenario.stepDefinitions.example[0].values[j]] = this.selectedScenario.stepDefinitions.example[i].values[j];
      }
      this.data.push(js);
    }
    this.regexHightlightOnInit();
  }

  /**
   * Updates a field of the table
   * @param columnIndex index of the column of the changed value
   * @param rowIndex index of the row of the changed value
   * @param column name of the changed value column
   */
  /*updateField(columnIndex: number, rowIndex: number, column) {
    const control = this.getControl(rowIndex, column);
    if (control.valid) {
      const getCircularReplacer = () => {
        const seen = new WeakSet;
        return (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return;
            }
            seen.add(value);
          }
          return value;
        };
      };
      let reference = JSON.parse(JSON.stringify(this.controls.at(rowIndex).get(column), getCircularReplacer()));
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex-1] = reference._pendingValue;
      this.initializeTable();
    } else {
      console.log('CONTROL NOT VALID');
    }
   }*/

   /**
    * Get the controls of a specific cell
    * @param rowIndex index of the row
    * @param fieldName name of the cell column
    * @returns FormControl of the cell
    */
  /*getControl(rowIndex: number, fieldName: string): UntypedFormControl {
    this.selectedScenario.saved = false;
    return this.controls.at(rowIndex).get(fieldName) as UntypedFormControl;
  }*/

  /**
   * Updates the table controls and data
   */
  updateTable() {
    if (this.selectedScenario.stepDefinitions.example[1]) {
      this.exampleThere = true;
      this.initializeTable();
      this.initializeTableControls();
      this.lastRow = this.selectedScenario.stepDefinitions.example.slice(-1)[0];
      this.scenarioService.scenarioChangedEmitter();
    } else {
      this.exampleThere = false;
    }
  }

  /**
   * Emits an event to check if the example table should be removed
   * @param event change event
   * @param rowIndex row index of the changed cell
   */
  checkExample(event, rowIndex){
    this.checkRowIndex.emit(rowIndex + 1)
  }

  renameExample(columnIndex){
    this.newExampleModal.renameExample(this.selectedScenario, columnIndex-1);
    this.updateTable();
  }

  /**
   * Emitts the delete scenario event
   * @param event
   */
  deleteExample(event, columnIndex) {
    this.indexOfExampleToDelete = columnIndex-1
    this.deleteExampleEvent.emit();
    this.showDeleteExampleToast(event)
  }

  /**
   * Opens the delete example toast
   * @param scenario
   */
   showDeleteExampleToast(scenario: Scenario) {
    this.apiService.nameOfComponent('example');
    this.toastr.warning('Are your sure you want to delete this variable?', 'Delete variable?', {
        toastComponent: DeleteToast
    });
  }

  deleteExampleFunction(){
    let oldName = this.selectedScenario.stepDefinitions.example[0].values[this.indexOfExampleToDelete]
    this.selectedScenario.stepDefinitions.example.forEach((value, index) => {
      this.selectedScenario.stepDefinitions.example[index].values.splice(this.indexOfExampleToDelete, 1)
    })

    if(this.selectedScenario.stepDefinitions.example[0].values.length == 0){
      this.selectedScenario.stepDefinitions.example = []
    }

    this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.given[index].values[i] = ""
          this.selectedScenario.stepDefinitions.given[index].isExample[i] = undefined
        }
      })
    })

    this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.when[index].values[i] = ""
          this.selectedScenario.stepDefinitions.when[index].isExample[i] = undefined
        }
      })
    })

    this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
      value.values.forEach((val, i) => {
        if(val == '<'+oldName+'>'){
          this.selectedScenario.stepDefinitions.then[index].values[i] = ""
          this.selectedScenario.stepDefinitions.then[index].isExample[i] = undefined
        }
      })
    })

    this.updateTable()
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
    this.table.renderRows();
    this.replaceDragedValue();
    this.selectedScenario.saved = false;
  }
  /**
   * Change the order of rows
   */
  replaceDragedValue(){
    const newData = [];
    this.data.forEach((row) => {
      const newRow = [];
      Object.keys(row).forEach((key) => {
        newRow.push(row[key]);
      });
      newData.push(newRow);
    });
    for (let i = 1; i < this.selectedScenario.stepDefinitions.example.length; i++) {
      this.selectedScenario.stepDefinitions.example[i].values = newData[i-1]
    }
  }

  /**
   * Add value and highlight regex, Style regex in value and add value in selectedScenario
   * Value is in textContent and style is in innerHTML
   * @param el HTML element of contentedible div
   * @param columnIndex index of changed value in values
   * @param rowIndex index of changed value in example
   * @param initialCall if call is from ngDoCheck
   */
  private highlightRegex(el, columnIndex, rowIndex, initialCall) {
    const regexPattern1 =/\[Regex:(.*?)](?=\s|$)/g;// Regex pattern to recognize and highlight regex expressions -> start with [Regex: and end with ]
    const regexPattern2 =/\/\^.*?\$\/(?:\s*\/\^.*?\$\/)*(?=\s|$)/g;// Regex pattern to recognize and highlight regex expressions -> start with /^ and end with $/
    const regex = /(\{Regex:)(.*?)(\})(?=\s|$)/g;//new RegExp(`${regexPattern1.source}|${regexPattern2.source}`, 'g');
    const inputValue: string = el.textContent;
    const offset = this.getCaretCharacterOffsetWithin(el)

    if(!initialCall){
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex-1] = inputValue;
      this.selectedScenario.saved = false;
    }
    if(!initialCall){
      this.initialRegex = false;
    }
      
    let highlightedText: string;
    var regexDetected = false;
    if(this.isDark){
      highlightedText = inputValue.replace(regex, (match, match1, match2, match3) => {
        regexDetected = true;
        return `<span uk-tooltip="title:Regular Expression detected!;pos:right">`+
        `<span style="color: var(--light-grey); font-weight: bold">${match1}</span>`+
        `<span style="color: var(--light-blue); font-weight: bold">${match2}</span>`+
        `<span style="color: var(--light-grey); font-weight: bold">${match3}</span></span>`;
      });
    } else{
      highlightedText = inputValue.replace(regex, (match, match1, match2, match3) => {
        regexDetected = true;
        return `<span uk-tooltip="title:Regular Expression detected!;pos:right">`+
        `<span style="color: var(--brown-grey); font-weight: bold">${match1}</span>`+
        `<span style="color: var(--ocean-blue); font-weight: bold">${match2}</span>`+
        `<span style="color: var(--brown-grey); font-weight: bold">${match3}</span></span>`;
      });
    }

    el.innerHTML = highlightedText

    if(initialCall && regexDetected) {
      this.regexInStory = true
    }
    if(regexDetected && !this.regexInStory){
      this.regexInStory = true
      this.toastr.info('View our Documentation for more Info','Regular Expression detected!');
    }

    // Set cursor to correct position
    if(!initialCall){
      if (regexDetected){ //maybe not needed
        const selection = window.getSelection();
        selection.removeAllRanges()

        // Call the function to find the correct node and offset
        this.targetOffset = offset
        const result = this.findNodeAndOffset(el);

        if (result !== null) {
          const [node, offsetIndex] = result;
          requestAnimationFrame(() => {
            if (node.nodeType === 3) {
              // Text node
              selection.setBaseAndExtent(node, offsetIndex, node, offsetIndex);
            } else if (node.nodeType === 1 && node.childNodes.length > 0) {
              // Element node with child nodes (e.g., <span>)
              selection.setBaseAndExtent(node.childNodes[0], offsetIndex, node.childNodes[0], offsetIndex);
            }
          });
        }
      } else {
        requestAnimationFrame(() => {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.setBaseAndExtent(el.firstChild, offset, el.firstChild, offset)
        })
      }
      }
  }

  /**
   * Helper for Regex Highlighter, find right node and index for current cursor position
   * @param element HTMLElement
   * @returns node: node with cursor, number: offest of cursor in node
   */
  findNodeAndOffset(element: Node): [Node, number] | null {
    if (element.nodeType === 3) {
      // Text node
      const textLength = (element.nodeValue || "").length;
      if (this.targetOffset <= textLength) {
        return [element, this.targetOffset];
      } else {
        this.targetOffset -= textLength;
      }
    } else if (element.nodeType === 1){
      // Element node
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        const result = this.findNodeAndOffset(child);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }

  /**
     * Helper for Regex Highlighter, extract current cursor position
     * @param element HTMLElement
     * @returns num, offset of cursor position
     */
  getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
  }

  /**
     * Helper for inital hightlighting
     */
  regexHightlightOnInit(){
    this.regexInStory = false
      if(this.example_input){
        this.example_input.forEach(in_field => {  
        this.highlightRegex(in_field.nativeElement, undefined, undefined, true)
        });
      }
  }
}
