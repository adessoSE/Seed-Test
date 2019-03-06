Feature: Access scenario

Scenario: successful Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum"  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter"  

Then So I will be navigated to the site: "www.mjdiaries.com/forum" 


Scenario: failed Authentication

Given As a "User"

When I want to visit this site: "www.mjdiaries.com" 
When I want to click the Button: "Forum"  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter"  

Then So I will be navigated to the site: "www.mjdiaries.com/nope" 
Then So i can see in  the "User not allowed" textbox, the text "You dont have the permission to enter the forum!" 


