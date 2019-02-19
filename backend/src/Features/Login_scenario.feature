Feature: Login scenario

Scenario: successful Login
Given As a 

When I want to visit this site: www.addeso.de
When I want to click the Button: 
When I want to select multiple Values for: CatDogSpider

Then So I will be navigated to: www.adesso.de/myProfile
Then So i can see the Text: Successfully logged in


Scenario: failed Login
Given As a SomeUsernameSecret666

When I want to visite this site: www.gamestar.de
When I want to click the Button: 
When I want to select: Rpg

Then So I will be navigated to: www.gamestar.de/login
Then So i can see the Text: Password or User incorrect


