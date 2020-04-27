import { Component, OnInit } from '@angular/core';
import { ParentComponent } from '../parent/parent.component';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';


// here is the same template used as in the parent component
@Component({
  selector: 'app-test-account',
  templateUrl: '../parent/parent.component.html',
  styleUrls: ['../parent/parent.component.css']
})
export class TestAccountComponent extends ParentComponent implements OnInit {

  constructor(public apiService: ApiService) {
    super(apiService);
    this.loadStories()
  }

  ngOnInit() {
  }

  loadStories() {
    this.apiService
        .getStories(undefined)
        .subscribe((resp: Story[]) => {
          this.stories = resp;
          console.log(resp);
    });
  }
}
