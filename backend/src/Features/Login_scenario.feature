Feature: Login scenario

Scenario: successful Login
Given As a Guest   

When I want to visit this site: Website  www.addeso.de 
When I want to click the Button: Login   
When I want to select from the Pets multiple selection, the values CatDogSpider 

Then So I will be navigated to: Website  www.adesso.de/myProfile 
Then So i can see in  the Validation textbox, the text Successfully logged in 


Scenario: failed Login
Given As a User  SomeUsernameSecret666 

When I want to visite this site: Website  www.gamestar.de 
When I want to click the Button: Login   
When I want to select from the Games selection, the value Rpg 

Then So I will be navigated to: Website  www.gamestar.de/login 
Then So i can see in  the Validation textbox, the text Password or User incorrect 


