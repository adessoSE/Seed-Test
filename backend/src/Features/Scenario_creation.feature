Feature: Scenario creation

Scenario: successful Scenario creation
Given As a Guest   

When I want to visit this site: Website  www.cucumber.com 
When I want to click the Button: Create Scenario   

Then So i can see in  the Success textbox, the text New Scenario created 


Scenario: failed Scenario creation
Given As a Guest   

When I want to visit this site: Website  www.cucumber.com 
When I want to click the Button: Create Scenario   

Then So i can see in  the Error textbox, the text Could not create Scenario 


