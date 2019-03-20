Feature: Access scenario

@386696070_1
Scenario: successful Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum" identified by:  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter" identified by:  

Then So I will be navigated to the site: "www.mjdiaries.com/forum" 


@386696070_2
Scenario: failed Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum" identified by:  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter" identified by:  

Then So I will be navigated to the site: "www.mjdiaries.com/nope" 
Then So I can see in the "User not allowed" textbox, the text "You dont have the permission to enter the forum!" 


