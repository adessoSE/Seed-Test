Feature: Delete scenarios

Background: 

When I go to the website: "https://cucumber-app.herokuapp.com/login"  
And I insert "adessoCucumber" into the field "githubName" 
And I insert "119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868" into the field "token" 
And I click the button: "submit"  
And I click the button: "#"  
And I click the button: "TODO: Create Scenario as Background"  

@386693823_1
Scenario: successful Deletion

Given As a "Guest"  
Given I am on the website: "https://cucumber-app.herokuapp.com/#"  

When I click the button: " #42. Alpha Testing "  
When I click the button: "#42.1 New Scenario"  
When I click the button: "TODO: ID of "Unlock-Button""  
When I click the button: "..."  

Then So I can see the text "Scenario successfully deleted" in the textbox: "Scenario Deleted" 

@386693823_2
Scenario: No Scenario to delete

Given As a "Guest"  
Given I am on the website: "https://cucumber-app.herokuapp.com/#"  

When I click the button: " #42. Alpha Testing "  

Then So I can see the text "Scenario_Id does not exist" in the textbox: "Scenario not found" 

