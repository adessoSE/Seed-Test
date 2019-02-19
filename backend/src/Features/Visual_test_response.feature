Feature: Visual test response

Scenario: Visual Test Response
Given As a User  Supermankryptonite 

When I want to visit this site: Website  www.cucumber.com 
When I want to click the Button: Test it   

Then So I will be navigated to: Website  www.cucumber.com/results 
Then So i can see in  the Result textbox, the text ThenStep 1 Success 
Then So i can see in  the Result textbox, the text ThenStep 2 Failed 


