Feature: Delete scenarios

Background: 


@386693823_1
Scenario: successful Deletion

Given As a "Punisher" "Bullseye" 

When I am on the website: "www.cucumber.com"  
When I insert "Punisher" into the field "Username" 
When I insert "Bullseye" into the field "Password" 
When I click the button: "Delete Scenario"  

Then So I can see the text "Scenario successfully deleted" in the textbox: "Scenario Deleted" 

@386693823_2
Scenario: No Scenario to delete

Then I go to the website: "www.cucumber.com"  
Then I insert "Punisher" into the field "Username" 
Then I insert "Bullseye" into the field "Password" 
Then I click the button: "Delete Scenario"  

Example So I can see the text "Scenario_Id does not exist" in the textbox: "Scenario not found" 

