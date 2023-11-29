import { Input, Component, ViewChild, Output, EventEmitter, OnInit } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

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

  ngOnInit() {
    console.log(this.width, this.height)
  }

  setDefaultWindowSize(): void {
    this.width = 1920;
    this.height = 1080;
  }

  handleFormClick(event: Event) {
    if (this.shouldStopPropagation) {
        event.stopPropagation();
    }
  }
  
  saveWindowSize(event: Event): void {
    console.log(this.width, this.height)
    this.sizeChange.emit({ width: this.width, height: this.height })
    this.shouldStopPropagation = false;
  }

  closeMenu():void {
    this.shouldStopPropagation = false;
  }

}