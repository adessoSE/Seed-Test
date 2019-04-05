Feature: Story creation

@386693457_1
Scenario Outline: successful Story creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Story"  

Then So I can see in the "Success" textbox, the text "New Story created" 

Examples:
 | userName | Password | 


@386693457_2
Scenario Outline: failed Story creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Story"  

Then So I can see in the "Error" textbox, the text "Could not create Story" 

Examples:
 | userName | Password | 


