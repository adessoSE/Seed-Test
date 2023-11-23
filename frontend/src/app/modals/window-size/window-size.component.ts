import { Input, Component, ViewChild, Output, EventEmitter, OnInit } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
// import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-window-size',
  templateUrl: './window-size.component.html',
  styleUrls: ['./window-size.component.css']
})
export class WindowSizeComponent implements OnInit {

  shouldStopPropagation: boolean = true;

  @ViewChild('appMenu') menuTrigger: MatMenuTrigger;
  @Input() width: number;
  @Input() height: number;
  @Output() sizeChange = new EventEmitter<{ width: number, height: number }>

  tempWidth: number = null;
  tempHeight: number = null;


  ngOnInit() {
    this.tempWidth = this.width;
    this.tempHeight = this.height;
  }

  setDefaultWindowSize(): void {
    console.log('Menu Trigger:', this.menuTrigger);
    this.tempWidth = 1920;
    this.tempHeight = 1080;
  }

  handleFormClick(event: Event) {
    if (this.shouldStopPropagation) {
        event.stopPropagation();
    }
  }
  
  saveWindowSize(event: Event): void {
    this.sizeChange.emit({ width: this.tempWidth, height: this.tempHeight })
    this.shouldStopPropagation = false;
  }

}
