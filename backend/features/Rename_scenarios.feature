Feature: Rename scenarios

Background: 


@386692174_1
Scenario Outline: Renamed Scenario

Given As a "User"
Given I am on the website: "r"  
Given I am on the website: "r"  

When I am on the website: "www.mywebsite.com"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field "Scenario Name" 
When I click the button: "Save"  
When I select the option "" from the drop-down-menue "<l>" 

Then So I can see the text "Updated scenario name." in the textbox: "Validation" 
Then So I will be navigated to the website: "wwgggg"  

Examples:
 | l | 
 | value | 
 | value | 
 | value | 
 | value | 
 | value | 


@386692174_2
Scenario: Faild Updating

Given As a "Guest"  

When I am on the website: "www.mywebsite.com"  
When I click the button: "Edit"  
When I insert "Renamed Scenario" into the field "Scenario Name" 
When I click the button: "Save"  

Then So I can see the text "Could not update scenario name!" in the textbox: "Validation" 

@386692174_3
Scenario: New Scenario




@386692174_4
Scenario: New Scenario

Given I am on the website: "xxx"  



