Feature: Access scenario

Scenario: successful Authentication
Given As a User  SpidermanMaryJane 

When I want to visit this site: Website  www.mjdiaries.com 
When I want to click the Button: Forum   
When I want to insert into the Username field, the value/text Spiderman 
When I want to insert into the Password field, the value/text MaryJane 
When I want to click the Button: Enter   

Then So I will be navigated to: Website  www.mjdiaries.com/forum 


Scenario: failed Authentication
Given As a User  SpidermanMaryJane 

When I want to visit this site: Website  www.mjdiaries.com 
When I want to click the Button: Forum   
When I want to insert into the Username field, the value/text Spiderman 
When I want to insert into the Password field, the value/text MaryJane 
When I want to click the Button: Enter   

Then So I will be navigated to: Website  www.mjdiaries.com/nope 
Then So i can see in  the User not allowed textbox, the text You dont have ther permission to enter the forum! 


