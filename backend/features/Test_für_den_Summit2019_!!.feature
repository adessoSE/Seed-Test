Feature: Test für den Summit2019 !!

Background: 


@492227547_1
Scenario: Prime Kunde 5 Büchern

Given As a "Prime Kunde"  
Given I am on the website: "www.amazon.com/warenkorb"  

When I click the button: "Delivery Options"  

Then So I can see the text "Free Delivery" in the textbox:  ""

