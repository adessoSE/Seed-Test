Feature: Access scenario

Background: 

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
And I want to insert into the "login_field" field, the value "<userName>" 
And I want to insert into the "password" field, the value "<password>" 
And I want to click the Button: "commit" 

@386696070_1
Scenario: successful Authentification

Given As a "Guest"  

When I want to visit this site: "https://www.adesso.de/" 
When I want to click the Button: "Login" 
When I want to select from the "Pets" multiple selection, the values "Cat""Dog""Spider" 

Then So I will be navigated to the site: "www.adesso.de/myProfile" 
Then So I can see in the "Validation" textbox, the text "Successfully logged in" 

@386696070_2
Scenario: failed Authentification

Given As a "User"

When I want to visit this site: "www.gamestar.de" 
When I want to click the Button: "Login" 
When I want to select from the "Games" selection, the value "Rpg" 

Then So I will be navigated to the site: "www.gamestar.de/login" 
Then So I can see in the "Validation" textbox, the text "Password or User incorrect" 

