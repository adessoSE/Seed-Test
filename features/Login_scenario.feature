Feature: Login scenario

Scenario: successful Login

Given As a "Guest"  

When I want to visit this site: "Website" "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home" 
When I want to insert into the "login_field" field, the value 'tit84299@jaqis.com'
When I want to insert into the "password" field, the value "Cucumberidiots" 
When I want to insert into the "id_password" field, the value "Gurke123"
When I want to insert into the "id_re_password" field, the value "Gurke123"
When I want to select from the "checkbox-game-label" selection, the value "test"


