Feature: Visual test response

Background: 


@386692544_1
Scenario: Visual Test Response

Given As a "User"

When I want to visit this site: "www.cucumber.com" 
When I want to click the Button: "Test it" 

Then So I will be navigated to the site: "www.cucumber.com/results" 
Then So I can see in the "Result" textbox, the text "ThenStep 1 Success" 
Then So I can see in the "Result" textbox, the text "ThenStep 2 Failed" 

