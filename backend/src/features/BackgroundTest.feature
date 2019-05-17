Feature: Login scenario

Background:

Given As a "Guest"  

When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
When I want to insert into the "login_field" field, the value "AdorableHamster" 
When I want to insert into the "password" field, the value "cutehamsterlikesnuts2000" 
When I want to click the Button: "commit"  

@386694507_1
Scenario Outline: Successful Login

Then So I will be navigated to the site: "<website>" 

Examples:
| website | 
| https://github.com/ | 
| https://github.com/account/unverified-email | 



@386694507_2
Scenario: failed Login


Then So I will be navigated to the site: "https://github.com/session" 
Then So I can see in the "js-flash-container" textbox, the text "Incorrect username or password." 

