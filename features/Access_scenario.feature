Feature: Access scenario

@386696070_1
Scenario Outline: Successful Authentication

Given As a "Guest"  

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
When I want to insert into the "login_field" field, the value "<userName>" 
When I want to insert into the "password" field, the value "<password>" 
When I want to click the Button: "commit"  

Then So I will be navigated to the site: "https://github.com/session" 

Examples:
 | userName | password | 
 | AdorableHamster | cutehamsterlikesnuts2000 | 
 | NormalHamster | normalHamster123 | 
 | BabyHamster | babyHamster123 | 


@386696070_2
Scenario: failed Authentication

Given As a "User"

When I want to visit this site: "https://www.gamestar.de" 
When I want to click the Button: "Forum"  
When I want to insert into the "Username" field, the value "Spiderman" 
When I want to insert into the "Password" field, the value "MaryJane" 
When I want to click the Button: "Enter"  

Then So I will be navigated to the site: "www.mjdiaries.com/nope" 
Then So I can see in the "User not allowed" textbox, the text "You dont have the permission to enter the forum!" 

