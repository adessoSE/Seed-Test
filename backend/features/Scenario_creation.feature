Feature: Scenario creation

Background: 

When I am on the website: "https://cucumber-app.herokuapp.com/login"  
And I insert "adessoCucumber" into the field "githubName" 
And I insert "56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1" into the field "token" 
And I click the button: "submit"  
And I click the button: "#"  

@382626033_1
Scenario: successful Scenario creation

Given As a "Guest"  

When I am on the website: "https://cucumber-app.herokuapp.com/"  
When I click the button: "Create Scenario"  

Then So I can see the text "New Scenario created" in the textbox: "Sucess" 

@382626033_2
Scenario: failed Scenario creation

Given As a "Guest"  

When I am on the website: "www.cucumber.com"  
When I click the button: "Create Scenario"  

Then So I can see the text "Could not create Scenario" in the textbox: "Error" 

