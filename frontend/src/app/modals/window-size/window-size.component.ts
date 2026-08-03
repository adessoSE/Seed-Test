import { Component, ChangeDetectionStrategy, output, viewChild, input, linkedSignal, effect, untracked } from '@angular/core';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatSelect, MatOption } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
	selector: 'app-window-size',
	templateUrl: './window-size.component.html',
	styleUrls: ['./window-size.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [MatMenu, FormsModule, MatFormField, MatLabel, MatSelect, MatOption, MatInput, MatButton, MatMenuTrigger]
})
export class WindowSizeComponent {

	readonly menuTrigger = viewChild.required<MatMenuTrigger>('appMenu');
	// eslint-disable-next-line @angular-eslint/no-input-rename
	protected readonly widthInput = input.required<number>({ alias: 'width' });
	// eslint-disable-next-line @angular-eslint/no-input-rename
	protected readonly heightInput = input.required<number>({ alias: 'height' });
	readonly width = linkedSignal(() => this.widthInput());
	readonly height = linkedSignal(() => this.heightInput());
	readonly emulator = input.required<boolean>();
	readonly sizeChange = output<{
		width: number;
		height: number;
	}>();

	selectedResolution!: string;
	predefinedResolutions = ['3840x2160', '2560x1440', '1920x1080', '1600x900', '1536x864', '1440x900', '1366x768',  '1280x720'];

	/** Updates selected resolution when width or height changes (replaces ngOnInit + ngOnChanges) */
	private resolutionEffect = effect(() => {
		const w = this.width();
		const h = this.height();
		if (w !== undefined && h !== undefined)
			untracked(() => this.updateSelectedResolution());
	});

	// Updates the selected resolution; sets to 'custom' if the current resolution is not in the predefined list
	updateSelectedResolution() {
		const currentResolution = `${this.width()}x${this.height()}`;
		console.log(currentResolution);
		if (this.predefinedResolutions.includes(currentResolution))
			this.selectedResolution = currentResolution;
		else
			this.selectedResolution = 'custom';

	}

	// Sets the default window size and updates the selected resolution accordingly
	setDefaultWindowSize(): void {
		this.selectedResolution = '1920x1080';
	}

	// Saves the current window size and emits a size change event
	saveWindowSize(_event: Event): void {
		if (this.selectedResolution !== 'custom') {
			const [resWidth, resHeight] = this.selectedResolution.split('x').map(Number);
			this.width.set(resWidth);
			this.height.set(resHeight);
		}
		this.sizeChange.emit({ width: this.width(), height: this.height() });
	}

}
