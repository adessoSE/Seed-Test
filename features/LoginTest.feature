Feature: LoginTest

    Scenario: successful Login

        Given As a "Guest"

        When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"
        When I want to insert into the "login_field" field, the value 'AdorableHamster'
        When I want to insert into the "password" field, the value "cutehamsterlikesnuts2000"
        When I want to click the Button: "commit"

        Then So I will be navigated to the site: "https://github.com/account/unverified-email"
        Then So I can see in the "h1" textbox, the text "Please verify your email address"