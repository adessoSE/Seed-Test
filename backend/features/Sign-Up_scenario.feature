Feature: Sign-Up scenario

Background: 


@386696256_1
Scenario: successful Sign Up

Given As a  

When I am on the website: "https://forum.golem.de/register.php?121624"  
When I click the button: "golemAcceptCookies();"  
When I insert "abcdefguuh1234567890" into the field "reg-username" 
When I insert "telefonnuuummer@gmail.com" into the field "reg-email" 
When I insert "cucumber2000" into the field "reg-password" 
When I insert "cucumber2000" into the field "reg-password2" 
When I select from the "name" multiple selection, the values "tos_accept" 
When I click the button: "Abschicken"  

Then So I will be navigated to the site: "https://forum.golem.de/register.php"  

@386696256_2
Scenario: failed Sign Up

Then I am on the website: "https://forum.golem.de/register.php?121624"  
Then I click the button: "golemAcceptCookies();"  
Then I insert "abcdefguuh1234567890" into the field "reg-username" 
Then I insert "telefonnuuummer@gmail.com" into the field "reg-email" 
Then I insert "cucumber2000" into the field "reg-password" 
Then I insert "cucumber2000" into the field "reg-password2" 
Then I select from the "name" multiple selection, the values "tos_accept" 
Then I click the button: "Abschicken"  

Example So I will be navigated to the website: "https://forum.golem.de/register.php"  
Example So I can see the text "Dieser Name wird bereits von einem Benutzer verwendet. Wenn Sie derjenige sind, loggen Sie sich bitte ein. Ansonsten nutzen Sie bitte einen anderen Namen." in the textbox: "attention" 

