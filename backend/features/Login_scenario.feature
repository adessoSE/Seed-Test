Feature: Login scenario

Background: 


@386694507_1
Scenario Outline: Successful Login

Given As a "Guest"  

When I am on the website: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"  
When I insert "<userName>" into the field "login_field" 
When I insert "<password>" into the field "password" 
When I click the button: "commit"  

Then So I will be navigated to the website: "<website>"  

Examples:
 | userName | password | website | 
 | AdorableHamster | cutehamsterlikesnuts2000 | https://github.com/sessions/verified-device | 
 | NormalHamster | FatHamster123 | https://github.com/sessions/verified-device | 
 | OldHamster | UglyHamster123 | https://github.com/sessions/verified-device | 


@386694507_2
Scenario: failed Login

Given As a "User"

When I am on the website: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"  
When I insert "arbage" into the field "login_field" 
When I insert "number" into the field "password" 
When I click the button: "commit"  

Then So I will be navigated to the website: "https://github.com/session"  
Then So I can see the text "Incorrect username or password" in the textbox: "div" 

