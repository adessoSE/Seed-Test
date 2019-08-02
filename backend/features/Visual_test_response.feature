Feature: Visual test response

Background: 


@386692544_1
Scenario: Visual Test Response

Given As a "Superman" "kryptonite" 

When I am on the website: "www.cucumber.com"  
When I click the button: "Test it"  

Then So I will be navigated to the website: "www.cucumber.com/results"  
Then So I can see the text "ThenStep 1 Success" in the textbox: "Result" 
Then So I can see the text "ThenStep 2 Failed" in the textbox: "Result" 

