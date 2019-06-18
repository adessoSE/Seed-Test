Feature: LoginTest

    Scenario: successful Login

        Given As a "Guest"

        When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"
        When I want to insert into the "login_field" field, the value ""
        When I want to insert into the "password" field, the value ""
        When I want to click the Button: "commit"

        Then So I can see in the "container" textbox, the text "Incorrect username or password."