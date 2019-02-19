Feature: Sign-Up scenario

Scenario: successful Sign Up
Given As a Supermankryptonite

When I want to visit this site: www.superheroes.com
When I want to click the Button: 
When I want to insert into the Supermanfield, the value/text
When I want to insert: kryptonite
When I want to click the Button: 

Then So I will be navigated to: www.superheroes.com/newProfile
Then So i can see the Text: Successfully Signed Up


Scenario: failed Sign Up
Given As a Supermankryptonite

When I want to visite this site: www.superheroes.com
When I want to click the Button: 
When I want to insert into the Supermanfield, the value/text
When I want to insert: kryptonite
When I want to click the Button: 

Then So I will be navigated to: www.superheroes.com/newProfile
Then So i can see the Text: Error code 4711


