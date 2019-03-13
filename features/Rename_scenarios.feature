Feature: Rename scenarios

Scenario: Renamed Scenario

Given As a "User"

When I want to visit this site: "www.mywebsite.com" 
When I want to click the Button: "Edit"  
When I want to insert into the "Scenario Name" field, the value "Renamed Scenario" 
When I want to click the Button: "Save"  

Then So I can see in the "Validation" textbox, the text "Updated scenario name." 


Scenario: Faild Updating

Given As a "Guest"  

When I want to visit this site: "www.mywebsite.com" 
When I want to click the Button: "Edit"  
When I want to insert into the "Scenario Name" field, the value "Renamed Scenario" 
When I want to click the Button: "Save"  

Then So I can see in the "Validation" textbox, the text "Could not update scenario name!" 


