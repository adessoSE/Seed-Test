Feature: Scenario creation

Background: 


@382626033_1
Scenario: successful Scenario creation

Given As a "Guest"  

When I am on the website: "https://www.cucumber.com/"  
When I click the button: "Create Scenario"  

Then So I can see the text "New Scenario created" in the textbox: "Sucess" 

@382626033_2
Scenario: failed Scenario creation

Given As a "Guest"  

When I am on the website: "www.cucumber.com"  
When I click the button: "Create Scenario"  

Then So I can see the text "Could not create Scenario" in the textbox: "Error" 

@382626033_3
Scenario: New Scenario




@382626033_4
Scenario: Test Scenario




