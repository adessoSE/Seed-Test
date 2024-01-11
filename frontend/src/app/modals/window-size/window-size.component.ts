import { Input, Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-window-size',
  templateUrl: './window-size.component.html',
  styleUrls: ['./window-size.component.css']
})
export class WindowSizeComponent {

  @ViewChild('appMenu') menuTrigger: MatMenuTrigger;
  @Input() width: number;  
  @Input() height: number;  
  @Input() emulator: boolean;  
  @Output() sizeChange = new EventEmitter<{ width: number, height: number }>();

  selectedResolution: string;
  predefinedResolutions = ["3840x2160", "2560x1440", "1920x1080", "1600x900", "1280x720"];

  ngOnInit() {
    // Initialize the selected resolution based on the current width and height
    this.updateSelectedResolution();
  }

  // Updates the selected resolution; sets to 'custom' if the current resolution is not in the predefined list
  updateSelectedResolution() {
    const currentResolution = `${this.width}x${this.height}`;
    if (this.predefinedResolutions.includes(currentResolution)) {
      this.selectedResolution = currentResolution;
    } else {
      this.selectedResolution = 'custom';
    }
  }

  // Sets the default window size and updates the selected resolution accordingly
  setDefaultWindowSize(): void {
    this.width = 1920;
    this.height = 1080;
    this.selectedResolution = `${this.width}x${this.height}`;
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
