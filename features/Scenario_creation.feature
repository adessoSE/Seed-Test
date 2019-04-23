Feature: Scenario creation

Background: 


@382626033_1
Scenario: successful Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario" 

Then So I can see in the "Success" textbox, the text "New Scenario created" 

@382626033_2
Scenario: failed Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario" 

Then So I can see in the "Error" textbox, the text "Could not create Scenario" 

