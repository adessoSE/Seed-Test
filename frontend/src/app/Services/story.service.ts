import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { Story } from '@seed-test/shared/models/Story';
import type { AiConfig, RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { catchError, tap } from 'rxjs/operators';
import { StepType } from '@seed-test/shared/models/StepType';
import { ActionTrigger } from './action-trigger';

/** Payload for creating a custom story via the signal */
interface CreateCustomStoryPayload {
	repositoryContainer: RepositoryContainer;
	story: { title: string; description: string };
}

/** Test execution parameters */
interface TestExecutionParams {
	repository?: string;
	source?: string;
}

/** Response from the AI scenario generation endpoint */
interface AiGenerationResponse {
	message: string;
	status: string;
	error?: string;
}

/** SSE result from the AI status stream */
interface AiStatusResult {
	status: string;
	error?: string;
	scenarios?: unknown[];
	/** Present on the success payload only — the error branch omits it */
	storyId?: string;
}

/**
 * Service for communication between story component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class StoryService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);
	notify = inject(NotificationService);

	/** Signal holding the latest stories array */
	readonly stories = signal<Story[]>([]);
	/** Action channel for rename story — carries {newStoryTitle, newStoryDescription} */
	readonly renameStoryTrigger = new ActionTrigger<{ newStoryTitle: string; newStoryDescription: string }>();
	/** Signal for delete story trigger */
	readonly deleteStoryTrigger = signal(0);
	/** Action channel for create custom story — carries the story object */
	readonly createCustomStoryTrigger = new ActionTrigger<CreateCustomStoryPayload>();
	/** Signal for active story view — carries the view name */
	readonly activeView = signal<string>('');
	/** Action channel for rename description — carries the new description */
	readonly renameDescriptionTrigger = new ActionTrigger<string>();
	/** Triggers the delete story signal */
	public deleteStoryEmitter() {
		this.deleteStoryTrigger.update(n => n + 1);
	}

	/**
  * Sets the active story view
  * @param viewName
  */
	changeStoryViewEvent(viewName: string) {
		this.activeView.set(viewName);
	}

	/**
  * Sets the rename story value
  * @param newStoryTitle
  * @param newStoryDescription
  */
	renameStoryEmit(newStoryTitle: string, newStoryDescription: string) {
		const val = { newStoryTitle, newStoryDescription };
		this.renameStoryTrigger.emit(val);
	}
	/**
  * Emits the create custom story action
  * @param story
  */
	createCustomStoryEvent(story: CreateCustomStoryPayload) {
		this.createCustomStoryTrigger.emit(story);
	}
	/**
    * Get's single Story by ID
    * @param _id storyID
    * @return single Story object
  */
	public getStory(_id: string): Observable<Story> {
		return this.http
			.get<Story>(this.apiService.apiServer + '/story/' + _id, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
   * Get's single Story by Issue Key
   * @param issueKey
   * @return single Story object
  */
	public getStoryByIssueKey(issueKey: string): Observable<Story> {
		return this.http.get<Story>(`${this.apiService.apiServer}/story/issueKey/${issueKey}`, ApiService.getOptions());
	}

	/**
    * Creates a story
    * @param title
    * @param description
    * @param repository
    * @param _id id of the repository
    * @returns
  */
	public createStory(title: string, description: string, repository: string, _id: string): Observable<Story> {
		const body = { 'title': title, 'description': description, 'repo': repository, '_id': _id };
		return this.http
			.post<Story>(this.apiService.apiServer + '/story/', body, ApiService.getOptions())
			.pipe(
				tap(_ => {
					//
				})
			);
	}
	/**
    * updates a Story
    * @param story updatedStory
  */
	public updateStory(story: Story): Observable<Story> {
		return this.http
			.put<Story>(this.apiService.apiServer + '/story/' + story._id, story, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}
	/**
    * deletes a Story
    * @param repository Specifies the repository where a Story should be deleted
    * @param _id StoryID
  */
	public deleteStory(repository: string, _id: string): Observable<Story> {
		return this.http
			.delete<Story>(this.apiService.apiServer + '/story/' + repository + '/' + _id, ApiService.getOptions())
			.pipe(tap());
	}
	/**
    * Retrieves the stories
    * @param repository
    * @returns
  */
	getStories(repository: RepositoryContainer): Observable<Story[]> {
		let params: Record<string, string> = {};
		if (repository.source === 'github') {
			const repo = repository.repoName.split('/');
			params = { repoName: repository.repoName, githubName: repo[0], repository: repo[1], source: repository.source, id: repository._id! };
		} else if (repository.source === 'jira') 
			params = { projectKey: repository.repoName, source: repository.source, id: repository._id! };
		else if (repository.source === 'db') 
			params = { repoName: repository.repoName, source: repository.source, id: repository._id! };
    

		return this.http
			.get<Story[]>(this.apiService.apiServer + '/story/', { params, withCredentials: true })
			.pipe(
				tap(resp => {
					this.stories.set(resp);
				}), catchError(this.apiService.handleStoryError));
	}
	/**
   * Updating story list (only affects repo)
   * @param repo_id
   * @param storiesList
   * @returns
  */
	updateStoryList(repo_id: string, storiesList: (string | undefined)[]) {
		return this.http
			.put(this.apiService.apiServer + '/story/list/' + repo_id, { storyIds: storiesList.filter((id): id is string => id != null) }, ApiService.getOptions())
			.pipe(tap());
	}
	/**
   * Runs a test of a scenario or story
   * @param storyID
   * @param scenarioID
   * @param params
   * @returns
  */
	runTests(storyID: string, scenarioID: number | null, params: TestExecutionParams) {
		const timeout = 900000;
		if (scenarioID) 
			return this.http
				.post(this.apiService.apiServer + '/execute/Scenario/' + storyID + '/' + scenarioID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
    
		return this.http
			.post(this.apiService.apiServer + '/execute/Feature/' + storyID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
	}
	/**
    * Download a file with story feature
    * @param _id
    * @returns
  */
	downloadStoryFeatureFile(_id: string): Observable<Blob> {
		return this.http
			.get<Blob>(this.apiService.apiServer + '/story/download/story/' + _id, { withCredentials: true, responseType: 'blob' as 'json' });
	}

	/**
    * Checkbox with executes all scenarios consecutively in one single Browser session.
    * @param oneDriver
    * @param storyID
    * @returns
  */
	public changeOneDriver(oneDriver: boolean, storyID: string) {
		return this.http
			.post(this.apiService.apiServer + '/story/oneDriver/' + storyID, { oneDriver }, ApiService.getOptions());
	}
	/**
    * Checking the same name of the story
    * @param buttonId
    * @param input
    * @param array
    * @param story?
    * @returns
  */
	public storyUnique(buttonId: string, input: string, array: Story[], story?: Story) {
		array = array ? array : [];
		input = input ? input : '';
		const button = (document.getElementById(buttonId)) as HTMLButtonElement;
		if ((input && !array.find(i => i.title === input)) || (story ? array.find(g => g._id === story._id && g.title === input) : false)) 
			button.disabled = false;
		else {
			button.disabled = true;
			this.notify.error('This Story Title is already in use. Please choose another Title');
		}
	}
	/**
   * Retrieves the step types
   * @returns
   */
	getStepTypes(): Observable<StepType[]> {
		return this.http
			.get<StepType[]>(this.apiService.apiServer + '/stepTypes', ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}
	/**
    * Redirecting to Jira/GitHub ticket directly
    * @param storyId
    * @param repository
    * @returns
  */
	public goToTicket(storyId: string, repository: RepositoryContainer) {
		if (repository.source === 'github') {
			const AUTHORIZE_URL = 'https://github.com/' + repository.repoName + '/issues/';
			const s = `${AUTHORIZE_URL}${storyId}`;
			return window.open(s);
		} else if (repository.source === 'jira') {
			const AUTHORIZE_URL = 'https://jira.adesso.de/browse/';
			const s = `${AUTHORIZE_URL}${storyId}`;
			return window.open(s);
		}
	}

	/**
   * Sends request to generate scenarios with AI.
   * @param storyId ID of story affected.
   * @param aiConfig Configuration for the parser.
   * @returns Obervable with success message.
   */
	generateScenariosFromAI(storyId: string, aiConfig: AiConfig, repoId: string): Observable<AiGenerationResponse> {
		const url = this.apiService.apiServer + `/story/${storyId}/generate-scenarios`;
		const timeout = 300000; // 5 minutes timeout
    
		// Create custom headers to set the timeout for this specific request
		const headers = new HttpHeaders({
			'timeout': `${timeout}`,
			'repoId': repoId
		});

		const options = {
			...ApiService.getOptions(),
			headers: headers
		};

		return this.http.post<AiGenerationResponse>(url, { aiConfig }, options);
	}

	/**
   * Listens for AI generation status updates using Server-Sent Events.
   * @param storyId The ID of the story to listen for.
   * @returns An Observable that emits the result object from the backend.
   */
	listenForAiResults(storyId: string): Observable<AiStatusResult> {
		const url = this.apiService.apiServer + `/story/${storyId}/generate-scenarios/status`;
    
		return new Observable(observer => {
			const eventSource = new EventSource(url, { withCredentials: true });

			eventSource.onmessage = event => {
				const result = JSON.parse(event.data);
        
				if (result.status === 'error') 
					observer.error(new Error(result.error));
				else 
					observer.next(result);
        
        
				observer.complete();
				eventSource.close();
			};

			eventSource.onerror = _error => {
				observer.error(new Error('Connection to the AI status stream failed.'));
				eventSource.close();
			};

			return () => {
				if (eventSource.readyState !== eventSource.CLOSED) 
					eventSource.close();
        
			};
		});
	}

//   /**
//  * Updates XRay status in Jira for given step and testrun
//  */
//  updateXrayStatus(testRunId, stepId, status) {
//     const data = {
//       testRunId: testRunId,
//       stepId: stepId,
//       status: status
//     };
//     return this.http
//     .put(this.apiService.apiServer + '/jira/update-xray-status/', data, ApiService.getOptions())
//     .pipe(tap());
//   }
}
