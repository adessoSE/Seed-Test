Feature: Scenario creation

@382626033_1
Scenario Outline: successful Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario"  

Then So I can see in the "Success" textbox, the text "New Scenario created" 

Examples:
 | userName | Password | 


@382626033_2
Scenario Outline: failed Scenario creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Scenario"  

Then So I can see in the "Error" textbox, the text "Could not create Scenario" 

Examples:
 | userName | Password | 


