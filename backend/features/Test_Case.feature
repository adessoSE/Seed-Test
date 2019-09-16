Feature: Test Case

Background: 


@493165861_1
Scenario: My Test

Given As a "Host"  
Given I am on the website: "https://cucumber-app.herokuapp.com/login"  

When I click the button: "Login"  

Then So I will be navigated to the website: "https://cucumber-app.herokuapp.com/login"  

@493165861_2
Scenario: Wiki Test

Given As a "User"
Given I am on the website: "https://de.wikipedia.org/wiki/Wikipedia:Hauptseite"  

When I insert "Adesso AG" into the field "searchInput" 
When I click the button: "searchButton"  

Then So I will be navigated to the website: "https://de.wikipedia.org/wiki/Adesso_AG"  

@493165861_3
Scenario Outline: Wiki Test2

Given As a "User"
Given I am on the website: "https://de.wikipedia.org/wiki/Wikipedia:Hauptseite"  

When I insert "<search>" into the field "searchInput" 
When I click the button: "searchButton"  

Then So I will be navigated to the website: "<website>"  

Examples:
 | search | website | 
 | Cucumber (Software) | https://de.wikipedia.org/wiki/Cucumber_(Software) | 
 | Gherkin | https://de.wikipedia.org/wiki/Gherkin | 


