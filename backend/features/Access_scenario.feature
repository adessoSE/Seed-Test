Feature: Access scenario

Background: 

When I am on the website: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"  
And I insert "<userName>" into the field "login_field" 
And I insert "<password>" into the field "password" 
And I click the button: "commit"  

@386696070_1
Scenario: successful Authentification

Given As a "Guest"  

When I am on the website: "https://www.adesso.de/de/"  
When I click the button: "Login"  
When I select from the "Pets" multiple selection, the values "Cat""Dog""Spider" 

Then So I will be navigated to the site: "www.adesso.de/myProfile"  
Then So I can see the text "Successfully logged in" in the textbox: "Validation" 

@386696070_2
Scenario: failed Authentification

Given As a "SomeUsername" "Secret666" 

When I am on the website: "www.gamestar.de"  
When I click the button: "Login"  
When I select from the "Games" from the selection "Rpg" 

Then So I will be navigated to the site: "www.gamestar.de/login"  
Then So I can see the text "Password or User incorrect" in the textbox: "Validation" 

