Feature: Access scenario

@386696070_1
Scenario Outline: successful Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum"  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter"  

Then So I will be navigated to the site: "www.mjdiaries.com/forum" 

Examples:
 | userName | Password | 


@386696070_2
Scenario Outline: failed Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum"  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter"  

Then So I will be navigated to the site: "www.mjdiaries.com/nope" 
Then So I can see in the "User not allowed" textbox, the text "You dont have the permission to enter the forum!" 

Examples:
 | userName | Password | 


