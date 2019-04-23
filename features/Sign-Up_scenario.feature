Feature: Sign-Up scenario

Background: 


@386696256_1
Scenario: successful Sign Up

Given As a "User"

When I want to visit this site: "https://forum.golem.de/register.php?121624" 
When I want to click the Button: "golemAcceptCookies();" 
When I want to insert into the "reg-username" field, the value "abcdefguuh1234567890" 
When I want to insert into the "reg-email" field, the value "telefonnuuummer@gmail.com" 
When I want to insert into the "reg-password" field, the value "cucumber2000" 
When I want to insert into the "reg-password2" field, the value "cucumber2000" 
When I want to select from the "name" selection, the value "tos_accept" 
When I want to click the Button: "Abschicken" 

Then So I will be navigated to the site: "https://forum.golem.de/register.php" 

@386696256_2
Scenario: failed Sign Up

Given As a "User"

When I want to visit this site: "https://forum.golem.de/register.php?121624" 
When I want to click the Button: "golemAcceptCookies();" 
When I want to insert into the "reg-username" field, the value "abcdefguuh1234567890" 
When I want to insert into the "reg-email" field, the value "telefonnuuummer@gmail.com" 
When I want to insert into the "reg-password" field, the value "cucumber2000" 
When I want to insert into the "reg-password2" field, the value "cucumber2000" 
When I want to select from the "name" selection, the value "tos_accept" 
When I want to click the Button: "Abschicken" 

Then So I will be navigated to the site: "https://forum.golem.de/register.php" 
Then So I can see in the "attention" textbox, the text "Dieser Name wird bereits von einem Benutzer verwendet. Wenn Sie derjenige sind, loggen Sie sich bitte ein. Ansonsten nutzen Sie bitte einen anderen Namen." 

