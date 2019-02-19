Feature: Logout scenario

Scenario: successful Logout
Given As a User   

When I want to visit this site: Website  www.somehomepage.com/myhome 
When I want to click the Button: Logout   

Then So I will be navigated to: Website  www.somehomepage.com 
Then So i can see in  the Validation textbox, the text Successfully logged out 


