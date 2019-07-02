Feature: Logout scenario

Background: 

When I go to the website: "https://cucumber-app.herokuapp.com/login"  
And I insert "adessoCucumber" into the field "githubName" 
And I insert "119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868" into the field "token" 
And I click the button: "submit"  
And I click the button: "#"  

@386695799_1
<<<<<<< HEAD
Scenario: New Scenario


=======
Scenario: successful Logout

Given As a "User"
Given I am on the website: "https://cucumber-app.herokuapp.com/"  

When I click the button: "logoutButton"  
>>>>>>> production

Then So I will be navigated to the website: "https://cucumber-app.herokuapp.com/login"  
Then So I can see the text "Github Name" in the textbox: "githubName" 

