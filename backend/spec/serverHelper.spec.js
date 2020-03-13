const fs = require('fs');
const helper = require('../src/serverHelper');

describe('ServerHelper', () => {
  // describe("midNotEmpty", function() {
  //  it("should return empty string", function() {
  //    let values = null;
  //    let returnValue = helper.midNotEmpty(values);
  //    expect(returnValue).toBe('');
  //  });
//
  //  it("should return empty string", function() {
  //    let values = 'test';
  //    let returnValue = helper.midNotEmpty(values);
  //    expect(returnValue).toBe(`${values} `);
  //  });
  // });

  describe('getValues', () => {
    it('should return empty string', () => {
      const values = [];
      const returnValue = helper.getValues(values);
      expect(returnValue).toBe('');
    });
    it('should return also empty string', () => {
      const values = ['test1'];
      const returnValue = helper.getValues(values);
      expect(returnValue).toBe('');
    });

    it('should return only test2 string', () => {
      const values = ['test1', 'test2'];
      const returnValue = helper.getValues(values);
      expect(returnValue).toBe('"test2"');
    });

    it('should return only test2 and test3 string', () => {
      const values = ['test1', 'test2', 'test3'];
      const returnValue = helper.getValues(values);
      expect(returnValue).toBe('"test2""test3"');
    });
  });

  describe('getBackgroundSteps', () => {
    it('should return empty string', () => {
      const steps = [];
      const returnValue = helper.getBackgroundSteps(steps);
      expect(returnValue).toBe('\n');
    });

    it('should return only step string', () => {
      const steps = [{
        id: 1, mid: '', pre: 'I go to the website:', stepType: 'when', type: 'Website', values: ['https://seed-test-frontend.herokuapp.com/login'],
      }, {
        id: 4, mid: 'into the field', pre: 'I insert', stepType: 'when', type: 'Field', values: ['adessoCucumber', 'githubName'],
      }, {
        id: 5, mid: 'into the field', pre: 'I insert', stepType: 'when', type: 'Field', values: ['bef00afd223c0bcdaa18a43808f9e71d13bded9b', 'token'],
      }, {
        id: 4, mid: '', pre: 'I click the button:', stepType: 'when', type: 'Button', values: ['loginButton'],
      }, {
        id: 3, mid: '', pre: 'I click the button:', stepType: 'when', type: 'Button', values: ['repository_0'],
      }];
      const stringifyedSteps = 'When I go to the website: "https://seed-test-frontend.herokuapp.com/login"\nAnd I insert "adessoCucumber" into the field"githubName"\nAnd I insert "bef00afd223c0bcdaa18a43808f9e71d13bded9b" into the field"token"\nAnd I click the button: "loginButton"\nAnd I click the button: "repository_0"\n\n';
      const returnValue = helper.getBackgroundSteps(steps);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(stringifyedSteps.replace(/\s/g, '').replace(' ', ''));
    });
  });

  describe('getBackgroundContent', () => {
    it('should return empty Background string', () => {
      const background = { stepDefinitions: { when: [] } };
      const returnValue = helper.getBackgroundContent(background);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe('Background:\n\n'.replace(/\s/g, '').replace(' ', ''));
    });

    it('should return background convertet to string', () => {
      const background = {
        name: 'New Background',
        stepDefinitions: {
          when: [{
            id: 1, mid: '', pre: 'I go to the website:', stepType: 'when', type: 'Website', values: [''],
          }, {
            id: 2, mid: '', pre: 'I click the button:', stepType: 'when', type: 'Button', values: [''],
          }, {
            id: 3, mid: 'into the field', pre: 'I insert', stepType: 'when', type: 'Field', values: ['', ''],
          }, {
            id: 4, mid: 'from the selection', pre: 'I select ', stepType: 'when', type: 'Radio', values: ['', ''],
          }, {
            id: 5, mid: '', pre: 'I go to the website:', stepType: 'when', type: 'Website', values: ['gg'],
          }],
        },
      };
      const backgroundString = 'Background: \n\nWhen I go to the website: ""  \nAnd I click the button: ""  \nAnd I insert "" into the field"" \nAnd I select  "" from the selection"" \nAnd I go to the website: "gg"  \n\n';
      const returnValue = helper.getBackgroundContent(background);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(backgroundString.replace(/\s/g, '').replace(' ', ''));
    });
  });

  describe('jsUcfirst', () => {
    it('should return empty string', () => {
      const string = '';
      const returnValue = helper.jsUcfirst(string);
      expect(returnValue).toBe('');
    });

    it('should return Testing', () => {
      const string = 'testing';
      const returnValue = helper.jsUcfirst(string);
      const testResultString = string.charAt(0).toUpperCase() + string.slice(1);
      expect(returnValue).toBe(testResultString);
    });

    it('should return Done', () => {
      const string = 'Done';
      const returnValue = helper.jsUcfirst(string);
      expect(returnValue).toBe(string);
    });
  });

  describe('getSteps', () => {
    it('should return empty string', () => {
      const string = '';
      const stepType = '';
      const returnValue = helper.getSteps(string, stepType);
      expect(returnValue).toBe('');
    });

    it('should return given step string', () => {
      const given = [{
        id: 1, mid: '', pre: 'As a', stepType: 'given', type: 'Role', values: ['Prime Kunde'],
      }, {
        id: 2, mid: '', pre: 'I am on the website:', stepType: 'given', type: 'Website', values: ['www.amazon.com/warenkorb'],
      }];
      const stepType = 'given';
      const testResultString = 'Given As a "Prime Kunde" Given I am on the website: "www.amazon.com/warenkorb"';
      const returnValue = helper.getSteps(given, stepType);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });

    it('should return when step string', () => {
      const when = [{
        id: 1, mid: '', pre: 'I click the button:', stepType: 'when', type: 'Button', values: ['story0'],
      }, {
        id: 2, mid: '', pre: 'I click the button:', stepType: 'when', type: 'Button', values: ['run_story'],
      }];
      const stepType = 'when';
      const testResultString = 'When I click the button: "story0" When I click the button: "run_story"';
      const returnValue = helper.getSteps(when, stepType);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });

    it('should return then step string', () => {
      const then = [{
        id: 2, mid: '', pre: 'So I will be navigated to the website:', stepType: 'then', type: 'Website', values: ['https://forum.golem.de/register.php'],
      }];
      const stepType = 'then';
      const testResultString = 'Then So I will be navigated to the website: "https://forum.golem.de/register.php"';
      const returnValue = helper.getSteps(then, stepType);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });

    it('should return example step string', () => {
      const example = [];
      const stepType = 'example';
      const testResultString = '';
      const returnValue = helper.getSteps(example, stepType);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString);
    });
  });


  describe('getExamples', () => {
    it('should return example step string', () => {
      const example = [{
        id: 5, mid: 'into the field', pre: 'I insert', stepType: 'example', type: 'Field', values: ['userName', 'password'],
      }, {
        id: 5, mid: 'into the field', pre: 'I insert', stepType: 'example', type: 'Field', values: ['AdorableHamster', 'cutehamsterlikesnuts2000'],
      }, {
        id: 5, mid: 'into the field', pre: 'I insert', stepType: 'example', type: 'Field', values: ['NormalHamster', 'FatHamster123'],
      }, {
        id: 6, mid: '', pre: '', stepType: 'example', type: 'Add Variable', values: ['OldHamster', 'UglyHamster123'],
      }];
      const testResultString = 'Examples:| userName | password || AdorableHamster | cutehamsterlikesnuts2000 || NormalHamster | FatHamster123 || OldHamster | UglyHamster123 |';
      const returnValue = helper.getExamples(example);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });
  });

  describe('getScenarioContent', () => {
    it('should return scenario content string', () => {
      const scenarios = [{
        scenario_id: 2,
        name: 'New Scenario',
        stepDefinitions: {
          given: [], when: [], then: [], example: [],
        },
      }];
      const storyId = 382626033;
      const testResultString = '@382626033_2 Scenario: New Scenario';
      const returnValue = helper.getScenarioContent(scenarios, storyId);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });
  });

  describe('getFeatureContent', () => {
    it('should return feature content string', () => {
      const story = {
        story_id: 382626033,
        title: 'Scenario creation',
        body: 'As a user\r\nIn order to create different testcases\r\nI want to add a scenario to story\r\nwhen there are stories available.',
        state: 'open',
        issue_number: 2,
        assignee: 'cniebergall',
        assignee_avatar_url: 'https://avatars1.githubusercontent.com/u/45001224?v=4',
        scenarios: [{
          scenario_id: 2,
          name: 'New Scenario',
          stepDefinitions: {
            given: [], when: [], then: [], example: [],
          },
        }],
        background: { name: 'New Background', stepDefinitions: { when: [] } },
      };
      const testResultString = 'Feature: Scenario creation Background: @382626033_2 Scenario: New Scenario';
      const returnValue = helper.getFeatureContent(story);
      expect(returnValue.replace(/\s/g, '').replace(' ', '')).toBe(testResultString.replace(/\s/g, '').replace(' ', ''));
    });
  });

  // describe('writeFile', function(){
  //    it('should create feature file', function(){
  //        let selectedStory = {"story_id":386692544,"title":"Visual test response","body":"As a user,\r\nI want a visual response of my scenarios\r\nSo I can see if a test passed or failed","state":"open","issue_number":4,"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","scenarios":[{"scenario_id":2,"name":"New Scenario","stepDefinitions":{"given":[],"when":[],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["hhheg"]}],"example":[]},"comment":""}],"background":{"name":"New Background","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["",""]},{"id":4,"mid":"from the selection","pre":"I select ","stepType":"when","type":"Radio","values":["",""]},{"id":5,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["gg"]}]}}}
  //        let dirName = '';
  //        let testResultString = '@382626033_2 Scenario: New Scenario'
  //        let returnValue = helper.getScenarioContent(scenarios, storyId);
  //        expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
  //    });
  // })

  // describe('setOptions', function(){
  //    it('should set the options', function(){
  //        let reportTime = Date.now();
  //        helper.setOptions(reportTime);
  //        expect(helper.options.metadata.Platform).toBe(process.platform);
  //        expect(helper.options.name).toBe('Seed-Test Report');
  //        expect(helper.options.jsonFile).toBe(`features/reporting_${reportTime}.json`);
  //        expect(helper.options.output).toBe(`features/reporting_html_${reportTime}.html`);
  //    });
  // })

  // describe('fuseGitwitDb', function(){
  //    it('should fuse with db', function(){
  //        expect(returnValue).toBe(testResultString);
  //    });
  // })
});
