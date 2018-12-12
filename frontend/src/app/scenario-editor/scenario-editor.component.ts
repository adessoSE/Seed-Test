import { Component, OnInit } from '@angular/core';
import {tap} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";
import {ApiService} from "../Services/api.service";
declare var UIkit: any;
@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.css']
})
export class ScenarioEditorComponent implements OnInit {
  stories;
  selected;
  clicked;
  showEditor = false;
  editorLocked: boolean = true;
  private apiServer: string = "https://cucumberapp.herokuapp.com/api";

  constructor(
    private http: HttpClient,
    public apiService: ApiService
  ) {
    this.loadStories();
  }

  ngOnInit() {
  }

  showAlert(): void {
    UIkit.modal.alert('UIkit alert!');
  }

  public loadStories(){
      this.apiService
        .getStories()
        .subscribe(resp => {
          this.stories = resp;
          console.log('controller: stories loaded', this.stories);
        })
  }

  addScenario (story) {
    let scenario = {
      id: (this.stories[story.id-1].scenarios.length+1),
      text: "New" +(this.stories[story.id-1].scenarios.length+1),
      given_steps: [],
      when_steps: [],
      then_steps: [],
      success: null
    };
    this.stories[this.stories.indexOf(story)].scenarios.push(scenario);
  };

  deleteScenario(feature, scenario) {
    this.stories[feature.id-1].scenarios.splice(this.stories[feature.id-1].scenarios.indexOf(scenario), 1);
    this.showEditor = false;
  };

  lockEditor(){
    if(this.editorLocked == false){
      this.editorLocked = true;
    } else {
      this.editorLocked = false;
    }
  }

  select(item) {
    this.selected = item;
    // console.log("selected", this.selected)
    this.showEditor = true;
    this.editorLocked = true;
    this.clicked = item;
   //this.selectedRole = '';
  };
}
