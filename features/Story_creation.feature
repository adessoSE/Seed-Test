Feature: Story creation

Background: 


@386693457_1
Scenario: successful Story creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Story" 

Then So I can see in the "Success" textbox, the text "New Story created" 

@386693457_2
Scenario: failed Story creation

Given As a "Guest"  

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Create Story" 

Then So I can see in the "Error" textbox, the text "Could not create Story" 

