Feature: Scenario creation

Scenario: successful Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario"  

Then So I can see in the "Success" textbox, the text "New Scenario created" 


Scenario: failed Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario"  

Then So I can see in the "Error" textbox, the text "Could not create Scenario" 


