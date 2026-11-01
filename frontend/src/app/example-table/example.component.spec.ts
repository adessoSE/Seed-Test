import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Story } from '@seed-test/shared/models/Story';
import { ExampleComponent } from './example.component';

/** Mirrors scenario-editor: the parent holds the selection in a signal and binds it into app-example. */
@Component({
	selector: 'app-example-host',
	template: '<app-example [newlySelectedScenario]="scenario()" [newlySelectedStory]="story()" />',
	imports: [ExampleComponent]
})
class ExampleHostComponent {
	readonly scenario = signal<Scenario | undefined>(undefined);
	readonly story = signal<Story | undefined>(undefined);
}

const freshScenario = {
	scenario_id: 1,
	name: 'New Scenario',
	comment: '',
	stepDefinitions: { given: [], when: [], then: [] },
	multipleScenarios: []
} as unknown as Scenario;

const story = {
	story_id: 1, title: 'Test Story', body: '', storySource: 'github',
	background: { name: '', stepDefinitions: { when: [] } },
	scenarios: [freshScenario], state: 'open', assignee: '', assignee_avatar_url: '', repo_type: 'github'
} as unknown as Story;

describe('ExampleComponent', () => {
	let fixture: ComponentFixture<ExampleHostComponent>;
	let host: ExampleHostComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ExampleHostComponent],
			schemas: [NO_ERRORS_SCHEMA]
		}).compileComponents();

		fixture = TestBed.createComponent(ExampleHostComponent);
		host = fixture.componentInstance;
	});

	async function render(scenario: Scenario) {
		host.story.set(story);
		host.scenario.set(scenario);
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
	}

	it('renders the Activate Multiple Scenarios button when a fresh scenario arrives from the parent', async () => {
		await render(freshScenario);
		expect(fixture.nativeElement.querySelector('#example_add_step0')).not.toBeNull();
	});

	it('renders the Activate Multiple Scenarios button for a scenario stored without multipleScenarios', async () => {
		await render({ ...freshScenario, multipleScenarios: undefined });
		expect(fixture.nativeElement.querySelector('#example_add_step0')).not.toBeNull();
	});
});
