import { Component, OnInit } from '@angular/core';
import { ParentComponent } from '../parent/parent.component';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { RepositoryContainer } from '../model/RepositoryContainer';
import {ActivatedRoute} from "@angular/router";
import { ThemingService } from '../Services/theming.service';


/**
 * Component of the TestAccountComponent
 */
@Component({
  selector: 'app-test-account',
  templateUrl: '../parent/parent.component.html',
  styleUrls: ['../parent/parent.component.css']
})
export class TestAccountComponent extends ParentComponent implements OnInit {

  /**
   * Constructor
   * @param apiService 
   */
  constructor(public apiService: ApiService, public route: ActivatedRoute, themeService: ThemingService ) {
    super(apiService, route, themeService);
    this.loadStories()
  }

  /**
   * @ignore
   */
  ngOnInit() {}

  /**
   * Loads the stories from the test account
   */
  loadStories() {
    let repository: RepositoryContainer = {value: '', source: 'testaccount'}
    this.apiService
        .getStories(repository)
        .subscribe((resp: Story[]) => {
          this.stories = resp;
          console.log(resp);
    });
  }
}
