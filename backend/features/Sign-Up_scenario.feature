Feature: Sign-Up scenario

Background: 


@386696256_1
Scenario: successful Sign Up

Given As a  

When I want to visit this site: "https://forum.golem.de/register.php?121624"  
When I want to click the Button: "golemAcceptCookies();"  
When I want to insert into the "abcdefguuh1234567890" field, the value  
When I want to insert into the "telefonnuuummer@gmail.com" field, the value  
When I want to insert into the "cucumber2000" field, the value  
When I want to insert into the "cucumber2000" field, the value  
When I want to select from the "tos_accept" selection, the value  
When I want to click the Button: "Abschicken"  

Then So I will be navigated to the site: "https://forum.golem.de/register.php"  

@386696256_2
Scenario: failed Sign Up

Given As a  

When I want to visit this site: "https://forum.golem.de/register.php?121624"  
When I want to click the Button: "golemAcceptCookies();"  
When I want to insert into the "abcdefguuh1234567890" field, the value  
When I want to insert into the "telefonnuuummer@gmail.com" field, the value  
When I want to insert into the "cucumber2000" field, the value  
When I want to insert into the "cucumber2000" field, the value  
When I want to select from the "tos_accept" selection, the value  
When I want to click the Button: "Abschicken"  

Then So I will be navigated to the site: "https://forum.golem.de/register.php"  
Then So I can see in the "Dieser Name wird bereits von einem Benutzer verwendet. Wenn Sie derjenige sind, loggen Sie sich bitte ein. Ansonsten nutzen Sie bitte einen anderen Namen." textbox, the text  

