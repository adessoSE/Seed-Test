import { Input, Component, ViewChild, Output, EventEmitter, OnInit } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-window-size',
  templateUrl: './window-size.component.html',
  styleUrls: ['./window-size.component.css']
})
export class WindowSizeComponent implements OnInit {

  @ViewChild('appMenu') menuTrigger: MatMenuTrigger;
  @Input() width: number;
  @Input() height: number;
  @Output() sizeChange = new EventEmitter<{ width: number, height: number }>

  tempWidth: number;
  tempHeight: number;

  ngOnInit() {
    this.tempWidth = this.width;
    this.tempHeight = this.height;
  }

  public openMenu() {
    if (this.menuTrigger) {
      this.menuTrigger.openMenu();
    } else {
      console.error('MatMenuTrigger is not available');
    }
  }

  setDefaultWindowSize(): void {
    this.tempWidth = 1920;
    this.tempHeight = 1080;
  }

  saveWindowSize(event: Event): void {
    event.stopPropagation();
    this.sizeChange.emit({ width: this.tempWidth, height: this.tempHeight })
    if (this.menuTrigger) {
      this.menuTrigger.closeMenu();
    } else {
      console.error('MatMenuTrigger is not available');
    }  
  }

}
