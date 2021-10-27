import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-scenario',
  templateUrl: './rename-scenario.component.html',
  styleUrls: ['./rename-scenario.component.css']
})
export class RenameScenarioComponent {

  @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
   openRenameScenarioModal(oldTitle: string) {
    this.modalService.open(this.renameScenarioModal, {ariaLabelledBy: 'modal-basic-title'});
    const name = document.getElementById('newTitle') as HTMLInputElement;
    name.placeholder = oldTitle;
  }

/**
* Submits the new name for the scenario
*/
  submitRenameScenario() {
    const name = (document.getElementById('newTitle') as HTMLInputElement).value;
    this.apiService.renameScenarioEmit(name);
  }

}
