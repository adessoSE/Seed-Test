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
  @Output() sizeChange = new EventEmitter<{ width: number, height: number }>


  setDefaultWindowSize(): void {
    this.width = 1920;
    this.height = 1080;
  }
  
  saveWindowSize(event: Event): void {
    console.log(this.width, this.height)
    this.sizeChange.emit({ width: this.width, height: this.height })
   }

}