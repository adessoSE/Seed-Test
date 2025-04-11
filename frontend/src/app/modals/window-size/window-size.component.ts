import { Input, Component, ViewChild, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
    selector: 'app-window-size',
    templateUrl: './window-size.component.html',
    styleUrls: ['./window-size.component.css'],
    standalone: false
})
export class WindowSizeComponent {

  @ViewChild('appMenu') menuTrigger: MatMenuTrigger;
  @Input() width: number;  
  @Input() height: number;  
  @Input() emulator: boolean;  
  @Output() sizeChange = new EventEmitter<{ width: number, height: number }>();

  selectedResolution: string;
  predefinedResolutions = ["3840x2160", "2560x1440", "1920x1080", "1600x900", "1536x864", "1440x900", "1366x768",  "1280x720"];

  ngOnInit() {
    // Initialize the selected resolution based on the current width and height
    this.updateSelectedResolution();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.width || changes.height) {
      if (this.width !== undefined && this.height !== undefined) {
        this.updateSelectedResolution();
      }
    }
  }

  // Updates the selected resolution; sets to 'custom' if the current resolution is not in the predefined list
  updateSelectedResolution() {
    const currentResolution = `${this.width}x${this.height}`;
    console.log(currentResolution)
    if (this.predefinedResolutions.includes(currentResolution)) {
      this.selectedResolution = currentResolution;
    } else {
      this.selectedResolution = 'custom';
    }
  }

  // Sets the default window size and updates the selected resolution accordingly
  setDefaultWindowSize(): void {
    this.selectedResolution = "1920x1080";
  }

  // Saves the current window size and emits a size change event
  saveWindowSize(event: Event): void {
    if (this.selectedResolution !== 'custom') {
      const [resWidth, resHeight] = this.selectedResolution.split('x').map(Number);
      this.width = resWidth;
      this.height = resHeight;
    }
    this.sizeChange.emit({ width: this.width, height: this.height });
  }

}
