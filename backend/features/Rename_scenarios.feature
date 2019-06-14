Feature: Rename scenarios

Background: 


@386692174_1
Scenario: Renamed Scenario

Given As a  

When I want to visit this site: "www.mywebsite.com"  
When I want to click the Button: "Edit"  
When I want to insert into the "Renamed Scenario" field, the value  
When I want to click the Button: "Save"  

Then So I can see in the "Updated scenario name." textbox, the text  

@386692174_1
Scenario: Faild Updating

Given As a  

When I want to visit this site: "www.mywebsite.com"  
When I want to click the Button: "Edit"  
When I want to insert into the "Renamed Scenario" field, the value  
When I want to click the Button: "Save"  

Then So I can see in the "Could not update scenario name!" textbox, the text  

