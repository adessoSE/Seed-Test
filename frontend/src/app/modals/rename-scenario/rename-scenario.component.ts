import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ScenarioService } from 'src/app/Services/scenario.service';

@Component({
    selector: 'app-rename-scenario',
    templateUrl: './rename-scenario.component.html',
    styleUrls: ['./rename-scenario.component.css', '../layout-modal/layout-modal.component.css'],
    standalone: false
})
export class RenameScenarioComponent {

  modalReference: NgbModalRef;

  scenarioName:string;

  @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;

  constructor(private modalService: NgbModal, public scenarioService: ScenarioService) { }

/**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
   openRenameScenarioModal(oldTitle: string) {
    this.modalReference = this.modalService.open(this.renameScenarioModal, {ariaLabelledBy: 'modal-basic-title'});
    this.scenarioName = oldTitle;
  }

/**
* Submits the new name for the scenario
*/
  submitRenameScenario(form: NgForm) {
    const name = form.value.newTitle;
    this.scenarioService.renameScenarioEmit(name);
    this.modalReference.close();
  }

}
