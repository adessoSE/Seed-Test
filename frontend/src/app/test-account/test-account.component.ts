import { Component, OnInit } from '@angular/core';
import { ParentComponent } from '../parent/parent.component';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { ActivatedRoute } from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';


// here is the same template used as in the parent component
@Component({
  selector: 'app-test-account',
  templateUrl: '../parent/parent.component.html',
  styleUrls: ['../parent/parent.component.css']
})
export class TestAccountComponent extends ParentComponent implements OnInit {

  constructor(public apiService: ApiService, public route: ActivatedRoute) {
    super(apiService, route);
    this.loadStories()
  }

  ngOnInit() {
  }

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
