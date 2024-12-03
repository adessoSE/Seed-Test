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

  /**
   * Updates the Xray status for a single scenario given the selected test executions.
   * 
   * @param {Scenario} scenario - The scenario containing the test run steps.
   * @param {number[]} selectedExecutions - List of selected test execution IDs.
   * @param {string} status - The status to update (e.g., 'PASS', 'FAIL').
   * @returns {Promise<void>} A promise that resolves when the status update is complete.
   */
  async updateXrayStatus(scenario: Scenario, selectedExecutions: number[], status: string): Promise<void> {
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
   * Sends the Xray status to the backend given a specific test run and step.
   * 
   * @param {number} testRunId - The ID of the test run.
   * @param {number} stepId - The ID of the test run step.
   * @param {string} status - The status to update (e.g., 'PASS', 'FAIL').
   * @returns {Observable<any>} An observable that emits the result of the HTTP PUT request.
   */
  sendXrayStatus(testRunId: number, stepId: number, status: string) {
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
   * Retrieves the stories for each precondition.
   * 
   * @param {any[]} preConditions - An array of preconditions, each containing test sets.
   * @returns {any[]} An array of objects representing the results, including precondition details and associated stories.
   */
  getPreconditionStories(preConditions: any[]): any[] {
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
