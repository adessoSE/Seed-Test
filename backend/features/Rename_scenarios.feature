Feature: Rename scenarios

Background: 

When I go to the website: "https://seed-test-frontend.herokuapp.com/login"  
And I insert "adessoCucumber" into the field"githubName" 
And I insert "bef00afd223c0bcdaa18a43808f9e71d13bded9b" into the field"token" 
And I click the button: "loginButton"  
And I click the button: "repository_0"  

@386692174_1
Scenario: Rename Scenario

Given I am on the website: "https://seed-test-frontend.herokuapp.com/"  

When I click the button: "story1"  
When I click the button: "scenario_change_title"  
When I insert "Renamed Scenario" into the field"text" 
When I click the button: "change_scenario_title_save"  
When I click the button: "scenario_lock"  
When I go to the website: "https://seed-test-frontend.herokuapp.com/#"  
When I click the button: "story1"  

Then So I can see the text "Renamed Scenario" in the textbox:"scname" 

@386692174_2
Scenario: Failed Updating

Given As a "Guest"  

When I am on the website: "www.mywebsite.com"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field"Scenario Name" 
When I click the button: "Save"  

Then So I can see the text "Could not update scenario name!" in the textbox:"Validation" 

@386692174_3
Scenario: New Scenario




@386692174_4
Scenario: New Scenario




