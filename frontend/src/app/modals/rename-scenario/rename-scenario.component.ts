import { Component, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ScenarioService } from 'src/app/Services/scenario.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { NgStyle } from '@angular/common';

@Component({
    selector: 'app-rename-scenario',
    templateUrl: './rename-scenario.component.html',
    styleUrls: ['./rename-scenario.component.css', '../layout-modal/layout-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LayoutModalComponent, FormsModule, NgStyle]
})
export class RenameScenarioComponent {
	private modalService = inject(NgbModal);
	scenarioService = inject(ScenarioService);


	modalReference!: NgbModalRef;

	scenarioName!: string;

	readonly renameScenarioModal = viewChild.required<RenameScenarioComponent>('renameScenarioModal');

	/**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
	openRenameScenarioModal(oldTitle: string) {
		this.modalReference = this.modalService.open(this.renameScenarioModal(), {ariaLabelledBy: 'modal-basic-title'});
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
