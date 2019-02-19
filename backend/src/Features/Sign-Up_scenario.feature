Feature: Sign-Up scenario

Scenario: successful Sign Up
Given As a User  Supermankryptonite 

When I want to visit this site: Website  www.superheroes.com 
When I want to click the Button: Sign Up   
When I want to insert into the Username field, the value/text Superman 
When I want to insert into the Password field, the value/text kryptonite 
When I want to click the Button: Finish   

Then So I will be navigated to: Website  www.superheroes.com/newProfile 
Then So i can see in  the Validation textbox, the text Successfully Signed Up 


Scenario: failed Sign Up
Given As a User  Supermankryptonite 

When I want to visite this site: Website  www.superheroes.com 
When I want to click the Button: Sign Up   
When I want to insert into the Username field, the value/text Superman 
When I want to insert into the Password field, the value/text kryptonite 
When I want to click the Button: Finish   

Then So I will be navigated to: Website  www.superheroes.com/newProfile 
Then So i can see in  the Validation textbox, the text Error code 4711 


