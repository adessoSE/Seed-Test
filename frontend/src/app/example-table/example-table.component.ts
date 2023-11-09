import { Subscription } from 'rxjs';
import { DeleteToast } from './../delete-toast';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
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
  }

  /**
   * Updates a field of the table
   * @param columnIndex index of the column of the changed value
   * @param rowIndex index of the row of the changed value
   * @param column name of the changed value column
   */
  updateField(columnIndex: number, rowIndex: number, column) {
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
   }

   /**
    * Get the controls of a specific cell
    * @param rowIndex index of the row
    * @param fieldName name of the cell column
    * @returns FormControl of the cell
    */
  getControl(rowIndex: number, fieldName: string): UntypedFormControl {
    this.selectedScenario.saved = false;
    return this.controls.at(rowIndex).get(fieldName) as UntypedFormControl;
  }

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

  private highlightMatches(el, columnIndex, rowIndex, initialCall) {
    const regex = /@@[^ ]+/g;
    const inputValue: string = el.textContent;
    const offset = this.getCaretCharacterOffsetWithin(el)

    if(!initialCall){
      this.selectedScenario.stepDefinitions.example[rowIndex + 1].values[columnIndex-1] = inputValue
    }
    const trailingWhitepace = inputValue.slice(-1) == ' '
    console.log('inputValue', el.innerHTML.slice(-1))
    console.log('textContent',el.textContent.slice(-1))
    console.log(trailingWhitepace)
      
    const highlightedText = inputValue.replace(regex, (match) => `<span style="color: blue">${match}</span>`);

    const textIsRegex = regex.test(inputValue);
    console.log(inputValue)
    //if (trailingWhitepace){
      //highlightedText.concat(' ')
    //}
    console.log(highlightedText)
    el.innerHTML = highlightedText
    console.log(el)

    /*var regexDetected = false;
    let textIsRegex = false;

      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
  
      while ((match = regex.exec(inputValue)) !== null) {
        matches.push(match);
        textIsRegex = true;
      }
  
      const fragment = document.createDocumentFragment();
      let currentIndex = 0;
  
      // Create span with style for every regex match
      for (const match of matches) {
        const nonRegexPart = inputValue.substring(currentIndex, match.index);
        const matchText = match[0];
  
        if (nonRegexPart) {
          const nonRegexNode = document.createTextNode(nonRegexPart);
          fragment.appendChild(nonRegexNode);
        }
  
        const span = document.createElement('span');
          regexDetected = true;
          span.style.color = 'var(--ocean-blue)';
          span.style.fontWeight = 'bold';
        
        span.appendChild(document.createTextNode(matchText));
        fragment.appendChild(span);
  
        currentIndex = match.index + matchText.length;
      }
  
      const remainingText = inputValue.substring(currentIndex);
      if (remainingText) {
        const remainingTextNode = document.createTextNode(remainingText);
        fragment.appendChild(remainingTextNode);
      }
  
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
  
      el.appendChild(fragment);

      console.log(el)*/

    // Set cursor to correct position
    if(!initialCall){
      if (textIsRegex){ //maybe not needed
        const selection = window.getSelection();
        selection.removeAllRanges()

        // Check in which node the cursor is and set new offsetIndex to position in that node
        let length = 0;
        let preLength = 0;
        let node=0;
        let offsetIndex=0;
        for(let i = 0; i<= el.childNodes.length; i++) {
          length = el.childNodes[i].textContent.length
          if (preLength+length>=offset){
            offsetIndex = offset-preLength
            node=i
            break;
          }
          else {
            preLength = preLength+length
          }
        }

        requestAnimationFrame(() => {
        if (el.childNodes[node].nodeType == 3){ // in case childNode is text
          selection.setBaseAndExtent(el.childNodes[node], offsetIndex, el.childNodes[node], offsetIndex)
        } else { // in case childNode is span, childNode of span is text
          selection.setBaseAndExtent(el.childNodes[node].childNodes[0], offsetIndex, el.childNodes[node].childNodes[0], offsetIndex)
        }
      })
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
}
