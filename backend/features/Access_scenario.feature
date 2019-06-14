Feature: Access scenario

Background: 

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"  
And I want to insert into the "<userName>" field, the value  
And I want to insert into the "<password>" field, the value  
And I want to click the Button: "commit"  

@386696070_1
Scenario: successful Authentification

Given As a  

When I want to visit this site: "https://www.adesso.de/"  
When I want to click the Button: "Login"  
When I want to select from the "Cat" multiple selection, the values "Dog""Spider" 

Then So I will be navigated to the site: "www.adesso.de/myProfile"  
Then So I can see in the "Successfully logged in" textbox, the text  

@386696070_2
Scenario: failed Authentification

Given As a "SomeUsername" "Secret666" 

When I want to visit this site: "www.gamestar.de"  
When I want to click the Button: "Login"  
When I want to select from the "Rpg" selection, the value  

Then So I will be navigated to the site: "www.gamestar.de/login"  
Then So I can see in the "Password or User incorrect" textbox, the text  

