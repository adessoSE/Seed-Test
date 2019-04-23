Feature: Logout scenario

Background: 


@386695799_1
Scenario Outline: successful Logout

Given As a "User"

When I want to visit this site: "www.somehomepage.com/myhome" 
When I want to click the Button: "Logout" 

Then So I will be navigated to the site: "www.somehomepage.com" 
Then So I can see in the "Validation" textbox, the text "Successfully logged out" 

Examples:
 | Username | Password | 
 | Superman | Kyrptonit | 
 | www.somehomepage.com | testi | 


