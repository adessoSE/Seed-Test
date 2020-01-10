const helper = require('../src/serverHelper')

describe("ServerHelper", function() {
    //describe("midNotEmpty", function() {
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
    //});

    describe('getValues', function(){
        it('should return empty string', function(){
            let values = [];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('');
        });
        it('should return also empty string', function(){
            let values = ['test1'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('');
        });

        it('should return only test2 string', function(){
            let values = ['test1', 'test2'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('"test2"');
        });

        it('should return only test2 and test3 string', function(){
            let values = ['test1', 'test2', 'test3'];
            let returnValue = helper.getValues(values);
            expect(returnValue).toBe('"test2""test3"');
        });
    });

    describe('getBackgroundSteps', function(){
        it('should return empty string', function(){
            let steps = [];
            let returnValue = helper.getBackgroundSteps(steps);
            expect(returnValue).toBe('\n');
        });

        it('should return only step string', function(){
            let steps = [{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://seed-test-frontend.herokuapp.com/login"]},{"id":4,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["adessoCucumber","githubName"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["bef00afd223c0bcdaa18a43808f9e71d13bded9b","token"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["loginButton"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["repository_0"]}];
            let stringifyedSteps= `When I go to the website: "https://seed-test-frontend.herokuapp.com/login"\nAnd I insert "adessoCucumber" into the field"githubName"\nAnd I insert "bef00afd223c0bcdaa18a43808f9e71d13bded9b" into the field"token"\nAnd I click the button: "loginButton"\nAnd I click the button: "repository_0"\n\n`
            let returnValue = helper.getBackgroundSteps(steps);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(stringifyedSteps.replace(/\s/g, "").replace(' ', ''));
        });
    });

    describe('getBackgroundContent', function(){
        it('should return empty Background string', function(){
            let background = {"stepDefinitions":{"when":[]}};
            let returnValue = helper.getBackgroundContent(background);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe('Background:\n\n'.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return background convertet to string', function(){
            let background = {"name":"New Background","stepDefinitions":{"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["",""]},{"id":4,"mid":"from the selection","pre":"I select ","stepType":"when","type":"Radio","values":["",""]},{"id":5,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["gg"]}]}};
            let backgroundString= 'Background: \n\nWhen I go to the website: ""  \nAnd I click the button: ""  \nAnd I insert "" into the field"" \nAnd I select  "" from the selection"" \nAnd I go to the website: "gg"  \n\n';
            let returnValue = helper.getBackgroundContent(background);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(backgroundString.replace(/\s/g, "").replace(' ', ''));
        });
    });

    describe('jsUcfirst', function(){
        it('should return empty string', function(){
            let string = '';
            let returnValue = helper.jsUcfirst(string);
            expect(returnValue).toBe('');
        });

        it('should return Testing', function(){
            let string = 'testing';
            let returnValue = helper.jsUcfirst(string);
            let testResultString = string.charAt(0).toUpperCase() + string.slice(1);
            expect(returnValue).toBe(testResultString);
        });

        it('should return Done', function(){
            let string = 'Done';
            let returnValue = helper.jsUcfirst(string);
            expect(returnValue).toBe(string);
        });
    });

    describe('getSteps', function(){
        it('should return empty string', function(){
            let steps = {};
            let string = '';
            let stepType = ''
            let returnValue = helper.getSteps(string, stepType );
            expect(returnValue).toBe('');
        });

        it('should return given step string', function(){
            let given = [{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Prime Kunde"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["www.amazon.com/warenkorb"]}]
            let stepType = 'given';
            let testResultString = 'Given As a "Prime Kunde" Given I am on the website: "www.amazon.com/warenkorb"'
            let returnValue = helper.getSteps(given, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return when step string', function(){
            let when = [{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["run_story"]}]
            let stepType = 'when';
            let testResultString = 'When I click the button: "story0" When I click the button: "run_story"'
            let returnValue = helper.getSteps(when, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return then step string', function(){
            let then = [{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["https://forum.golem.de/register.php"]}]
            let stepType = 'then';
            let testResultString = 'Then So I will be navigated to the website: "https://forum.golem.de/register.php"'
            let returnValue = helper.getSteps(then, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });

        it('should return example step string', function(){
            let example = [];
            let stepType = 'example';
            let testResultString = '';
            let returnValue = helper.getSteps(example, stepType);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString);
        });
    });


    describe('getExamples', function(){
        it('should return example step string', function(){
            let example = [{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123"]}]
            let testResultString = 'Examples:| userName | password || AdorableHamster | cutehamsterlikesnuts2000 || NormalHamster | FatHamster123 || OldHamster | UglyHamster123 |'
            let returnValue = helper.getExamples(example);
            expect(returnValue.replace(/\s/g, "").replace(' ', '')).toBe(testResultString.replace(/\s/g, "").replace(' ', ''));
        });
    })
    


  });
