Feature: LoginTest

    Scenario: successful Login

        Given As a "Guest"

        When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"
        When I want to insert into the "login_field" field, the value 'AdorableHamster'
        When I want to insert into the "password" field, the value "cutehamsterlikesnuts2000"
        When I want to click the Button: "commit"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke/issues"
        When I want to select from the "aria-label" selection, the value "Select all issues"

        
    