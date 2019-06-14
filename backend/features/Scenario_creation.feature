Feature: Scenario creation

Background: 


@382626033_1
Scenario: successful Scenario creation

Given As a  

When I want to visit this site: "www.cucumber.com"  
When I want to click the Button: "Create Scenario"  

Then So I can see in the "New Scenario created" textbox, the text  

@382626033_2
Scenario: failed Scenario creation

Given As a  

When I want to visit this site: "www.cucumber.com"  
When I want to click the Button: "Create Scenario"  

Then So I can see in the "Could not create Scenario" textbox, the text  

