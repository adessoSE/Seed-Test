Feature: Story creation

Background: 


@386693457_1
Scenario: successful Story creation

Given As a "Guest"  

When I am on the website: "www.cucumber.com"  
When I click the button: "Create Story"  

Then So I can see the text "New Story created" in the textbox: "Success" 

@386693457_2
Scenario: failed Story creation

Given As a "Guest"  

When I am on the website: "www.cucumber.com"  
When I click the button: "Create Story"  

Then So I can see the text "Could not create Story" in the textbox: "Error" 

