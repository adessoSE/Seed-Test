Feature: Rename scenarios

Background: 

When I am on the website: "https://cucumber-app.herokuapp.com/login"  
And I insert "adessoCucumber" into the field "githubName" 
And I insert "56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1" into the field "token" 
And I click the button: "submit"  
And I click the button: "#"  

@386692174_1
Scenario: Renamed Scenario

Given As a "User"

When I am on the website: "https://cucumber-app.herokuapp.com/"  
When I click the button: "#2. Scenario Creation"  
When I click the button: "Unlock Scenario"  
When I click the button: "Change Scenario Title"  
When I insert "Scenario Creation2" into the field "ScenarioName" 
When I click the button: "Lock and Save Scenario"  

Then So I can see the text "Scenario Creation2" in the textbox: "storyTitle" 

@386692174_2
Scenario: Faild Updating

Given As a "Guest"  

When I am on the website: "https://cucumber-app.herokuapp.com/"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field "Scenario Name" 
When I click the button: "Save"  

Then So I can see the text "Could not update scenario name!" in the textbox: "Validation" 

