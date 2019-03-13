Feature: Logout scenario

Scenario: successful Logout

Given As a "User"

When I want to visit this site: "www.somehomepage.com/myhome" 
When I want to click the Button: "Logout"  

Then So I will be navigated to the site: "www.somehomepage.com" 
Then So I can see in the "Validation" textbox, the text "Successfully logged out" 


