import { AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import { CreateNewGroupComponent } from '../create-new-group/create-new-group.component';

@Component({
  selector: 'app-layout-modal',
  templateUrl: './layout-modal.component.html',
  styleUrls: ['./layout-modal.component.css']
})
export class LayoutModalComponent implements AfterViewInit {

  @Input() headerTemplate: TemplateRef<any>;
  @Input() bodyTemplate: CreateNewGroupComponent;
  @Input() footerTemplate: CreateNewGroupComponent;

  @ViewChild('layoutModal') layoutModal: LayoutModalComponent;

  constructor(private modalService: NgbModal) { }

  ngAfterViewInit() {
    console.log(this.headerTemplate, this.bodyTemplate)
    
  }

  openDialogWindow() {
    this.modalService.open(this.layoutModal,{ariaLabelledBy: 'modal-basic-title'})
  }

}
