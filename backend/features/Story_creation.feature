Feature: Story creation

Background: 


@386693457_1
Scenario: successful Story creation

Given As a  

When I want to visit this site: "www.cucumber.com"  
When I want to click the Button: "Create Story"  

Then So I can see in the "New Story created" textbox, the text  

@386693457_2
Scenario: failed Story creation

Given As a  

When I want to visit this site: "www.cucumber.com"  
When I want to click the Button: "Create Story"  

Then So I can see in the "Could not create Story" textbox, the text  

