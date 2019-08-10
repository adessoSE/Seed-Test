Feature: Rename scenarios

Background: 


@386692174_1
Scenario: Renamed Scenario

Given As a "User"

When I am on the website: "www.mywebsite.com"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field "Scenario Name" 
When I click the button: "Save"  

Then So I can see the text "Updated scenario name." in the textbox: "Validation" 

@386692174_2
Scenario: Faild Updating

Given As a "Guest"  

When I am on the website: "www.mywebsite.com"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field "Scenario Name" 
When I click the button: "Save"  

Then So I can see the text "Could not update scenario name!" in the textbox: "Validation" 

@386692174_3
Scenario: DBTest


When I want to visit this site: "www.gamestar.de"  

Then So I will be navigated to the site: "www.gamestar.de"  

