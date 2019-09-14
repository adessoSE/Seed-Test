Feature: CoP Test

Background: 


@493297524_1
Scenario: Test Login

Given As a "User"
Given I am on the website: "https://cucumber-app.herokuapp.com/login"  

When I click the button: "loginTest"  

Then So I will be navigated to the website: "https://cucumber-app.herokuapp.com"  

