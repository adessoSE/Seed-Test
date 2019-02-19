Feature: Access scenario

Scenario: successful Authentication
Given As a SpidermanMaryJane

When I want to visit this site: www.mjdiaries.com
When I want to click the Button: 
When I want to insert into the Spidermanfield, the value/text
When I want to insert: MaryJane
When I want to click the Button: 

Then So I will be navigated to: www.mjdiaries.com/forum


Scenario: failed Authentication
Given As a SpidermanMaryJane

When I want to visit this site: www.mjdiaries.com
When I want to click the Button: 
When I want to insert into the Spidermanfield, the value/text
When I want to insert: MaryJane
When I want to click the Button: 

Then So I will be navigated to: www.mjdiaries.com/nope
Then So i can see the Text: You dont have ther permission to enter the forum!


