import { Component, ChangeDetectionStrategy, inject, viewChild, TemplateRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ScenarioService } from 'src/app/Services/scenario.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-rename-scenario',
	templateUrl: './rename-scenario.component.html',
	styleUrls: ['./rename-scenario.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule]
})
export class RenameScenarioComponent {
	private modalService = inject(MatDialog);
	scenarioService = inject(ScenarioService);


	modalReference!: MatDialogRef<unknown>;

	scenarioName!: string;

	readonly renameScenarioModal = viewChild.required<TemplateRef<unknown>>('renameScenarioModal');

	/**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
	openRenameScenarioModal(oldTitle: string) {
		this.modalReference = this.modalService.open(this.renameScenarioModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
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
