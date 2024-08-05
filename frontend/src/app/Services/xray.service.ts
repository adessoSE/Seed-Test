import { Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { StoryService } from './story.service';
import { Scenario } from '../model/Scenario';

@Injectable({
  providedIn: 'root'
})
export class XrayService {

  constructor(public apiService: ApiService, private http: HttpClient, public storyService: StoryService) { }

  /*
   * Updates xray status for a single scenario given selected test executions
   * @param scenario - the scenario containing the test run steps
   * @param selectedExecutions - list of selected test executions
   * @param status - status to update
   */
  async updateXrayStatus(scenario: Scenario, selectedExecutions: number[], status: string) {
    if (scenario.testRunSteps && scenario.testRunSteps.length > 0) {
      for (const testRun of scenario.testRunSteps) {
        if (selectedExecutions.includes(testRun.testRunId)) {
          try {
            await this.sendXrayStatus(testRun.testRunId, testRun.testRunStepId, status).toPromise();
            console.log('XRay update successful for TestRunStepId:', testRun.testRunStepId, " and Test Execution:", testRun.testExecKey);
          } catch (error) {
            console.error('Error while updating XRay status for TestRunStepId:', testRun.testRunStepId, error);
          }
        }
      }
    }
  }

  /**
    * Send XRay status to backend
    */
  sendXrayStatus(testRunId, stepId, status) {
    const data = {
      testRunId: testRunId,
      stepId: stepId,
      status: status
    };
    return this.http
      .put(this.apiService.apiServer + '/jira/update-xray-status/', data, ApiService.getOptions())
      .pipe(tap());
  }

  /**
   * Get storys for each precondition
   */
  getPreconditionStories(preConditions) {
    let preConditionResults = [];
    for (const precondition of preConditions) {

      const testSetPromises = precondition.testSet.map(testKey =>
        this.storyService.getStoryByIssueKey(testKey).toPromise()
      );

      Promise.all(testSetPromises)
        .then(stories => {
          const results = {
            preConditionKey: precondition.preConditionKey,
            preConditionName: precondition.preConditionName,
            stories: stories
          };
          preConditionResults.push(results);
        })
        .catch(error => {
          console.error('Failed to fetch stories for a test set:', error);
        });
    }
    return preConditionResults;
  }
}
