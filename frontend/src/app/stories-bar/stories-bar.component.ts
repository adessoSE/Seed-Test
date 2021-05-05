import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import {RepositoryContainer} from "../model/RepositoryContainer";
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-stories-bar',
  templateUrl: './stories-bar.component.html',
  styleUrls: ['./stories-bar.component.css']
})
export class StoriesBarComponent implements OnInit {

  closeResult = '';
  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  db = false;

  @Output()
  storyChosen: EventEmitter<any> = new EventEmitter();
  @Output()
  scenarioChosen: EventEmitter<any> = new EventEmitter();

  constructor(public apiService: ApiService, private modalService: NgbModal) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      this.stories = stories;
      this.db = localStorage.getItem('source') === 'db' ;
    } );
  }
    
  /* modal mask start */
  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title', size: 'sm' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
  /* modal mask end */

  ngOnInit() {
  }


  getSortedStories() {
    if (this.stories) {
      return this.stories.sort(function(a, b) { 
        if(a.issue_number < b.issue_number) { return -1; }
        if(a.issue_number > b.issue_number) { return 1; }
        return 0;
      });
    }
  }

  selectScenario(storyID, scenario: Scenario) {
    this.selectedScenario = scenario;
    this.scenarioChosen.emit(scenario);
  }

  createnewStory() {
    console.log("Bin ich hier?")
    const title = (document.getElementById('storytitle') as HTMLInputElement).value;
    const description = (document.getElementById('storydescription') as HTMLInputElement).value;
    const value = localStorage.getItem('repository');
    const source = 'db';
    console.log("Der Titel aus dem Html: ", title)
    console.log("Das Repo: ", JSON.stringify(value))
    
    const repositorycontainer: RepositoryContainer = {value, source};
    this.apiService.createStory(title, description, value).subscribe(resp => {
      console.log(resp);
      this.apiService.getStories(repositorycontainer).subscribe((resp: Story[]) => {
        console.log('Stories');
        console.log(resp);
        this.stories = resp;
      });
    });
  }

  selectStoryScenario(story: Story) {
    this.selectedStory = story;
    this.storyChosen.emit(story);
    const storyIndex = this.stories.indexOf(this.selectedStory);
    if (this.stories[storyIndex].scenarios[0]) {
      this.selectScenario(this.selectedStory._id, this.stories[storyIndex].scenarios[0]);
    }
  }

}
