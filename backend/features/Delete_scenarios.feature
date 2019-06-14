Feature: Delete scenarios

Background: 


@386693823_1
Scenario: successful Deletion

Given As a "Punisher" "Bullseye" 

When I want to visit this site: "www.cucumber.com"  
When I want to insert into the "Punisher" field, the value  
When I want to insert into the "Bullseye" field, the value  
When I want to click the Button: "Delete Scenario"  

Then So I can see in the "Scenario successfully deleted" textbox, the text  

@386693823_2
Scenario: No Scenario to delete

Given As a "Punisher" "Bullseye" 

When I want to visit this site: "www.cucumber.com"  
When I want to insert into the "Punisher" field, the value  
When I want to insert into the "Bullseye" field, the value  
When I want to click the Button: "Delete Scenario"  

Then So I can see in the "Scenario_Id does not exist" textbox, the text  

