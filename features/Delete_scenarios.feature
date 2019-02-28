Feature: Delete scenarios

Scenario: successful Deletion

Given As a User

When I want to visit this site: Website  www.cucumber.com 
When I want to insert into the Username field, the value Punisher 
When I want to insert into the Password field, the value Bullseye 
When I want to click the Button: Delete Scenario   

Then So i can see in  the Scenario Deleted textbox, the text Scenario successfully deleted 


Scenario: No Scenario to delete

Given As a User

When I want to visit this site: Website  www.cucumber.com 
When I want to insert into the Username field, the value Punisher 
When I want to insert into the Password field, the value Bullseye 
When I want to click the Button: Delete Scenario   

Then So i can see in  the Scenario not found textbox, the text Scenario_Id does not exist 


