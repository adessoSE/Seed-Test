Feature: Login scenario

Background: 


@386694507_1
Scenario Outline: Successful Login

Given As a "Guest"  

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
When I want to insert into the "login_field" field, the value "<userName>" 
When I want to insert into the "password" field, the value "<password>" 
When I want to click the Button: "commit" 

Then So I will be navigated to the site: "<website>" 

Examples:
 | userName | password | website | 
 | AdorableHamster | cutehamsterlikesnuts2000 | https://github.com/ | 
 | NormalHamster | FatHamster123 | https://github.com/account/unverified-email | 
 | OldHamster | UglyHamster123 | https://github.com/account/unverified-email | 
 | value | value | value | 


@386694507_2
Scenario: failed Login

Given As a "User"

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
When I want to insert into the "login_field" field, the value "arbage" 
When I want to insert into the "password" field, the value "number" 
When I want to click the Button: "commit" 

Then So I will be navigated to the site: "https://github.com/session" 
Then So I can see in the "div" textbox, the text "Incorrect username or password" 

