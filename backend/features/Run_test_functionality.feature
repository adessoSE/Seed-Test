Feature: Run test functionality

Background: 

When I go to the website: "https://cucumber-app.herokuapp.com/login"  
And I insert "adessoCucumber" into the field "githubName" 
And I insert "119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868" into the field "token" 
And I click the button: "submit"  
And I click the button: "#"  

@386697647_1
Scenario: Run Test

Given As a "Guest"  

When I go to the website: "https://cucumber-app.herokuapp.com/"  
When I click the button: "#2. Scenario Creation"  
When I click the button: "Run Tests"  

Then So I can see the text "Loading . . ." in the textbox: "loading" 
Then So I can see the text "Test Results" in the textbox: "testreport" 

@386697647_2
Scenario: Run Story

Given As a "Guest"  

When I go to the website: "https://cucumber-app.herokuapp.com/"  
When I click the button: "#2. Scenario Creation"  
When I click the button: "Run Story"  

Then So I can see the text "Loading . . ." in the textbox: "loading" 
Then So I can see the text "Test Results" in the textbox: "testreport" 

