Feature: Run test functionality

Background: 


@386697647_1
Scenario: Run Test

Given As a "Guest"  

When I want to visit this site: "www.testing.com/myTestPage" 
When I want to click the Button: "Run" 

Then So I can see in the "Validation" textbox, the text "Start running test cases." 

