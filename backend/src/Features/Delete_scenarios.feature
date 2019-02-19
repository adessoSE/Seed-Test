Feature: Delete scenarios

Scenario: successful Deletion
Given As a PunisherBullseye

When I want to visit this site: www.cucumber.com
When I want to insert into the Punisherfield, the value/text
When I want to insert: Bullseye
When I want to click the Button: 

Then So i can see the Text: Scenario successfully deleted


Scenario: No Scenario to delete
Given As a PunisherBullseye

When I want to visit this site: www.cucumber.com
When I want to insert into the Punisherfield, the value/text
When I want to insert: Bullseye
When I want to click the Button: 

Then So i can see the Text: Scenario_Id does not exist


