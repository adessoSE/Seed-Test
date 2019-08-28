Feature: Run test functionality

Background: 


@386697647_1
Scenario: Run Test

Given As a "Guest"  

When I go to the website: "www.testing.com/myTestPage"  
When I click the button: "Run"  

Then So I can see the text "Start running test cases." in the textbox:  

