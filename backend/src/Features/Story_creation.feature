Feature: Story creation

Scenario: successful Story creation
Given As a Guest   

When I want to visit this site: Website  www.cucumber.com 
When I want to click the Button: Create Story   

Then So i can see in  the Success textbox, the text New Story created 


Scenario: failed Story creation
Given As a Guest   

When I want to visit this site: Website  www.cucumber.com 
When I want to click the Button: Create Story   

Then So i can see in  the Error textbox, the text Could not create Story 


