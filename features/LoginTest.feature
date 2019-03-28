Feature: LoginTest

    Scenario: successful Login

        Given As a "Guest"

        When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"
        When I want to insert into the "login_field" field, the value 'AdorableHamster'
        When I want to insert into the "password" field, the value "cutehamsterlikesnuts2000"
        When I want to click the Button: "commit" identified by: "name"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke" identified by: "href"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke/issues" identified by: "href"
        When I want to select from the "aria-label" selection, the value "Select all issues"

        Then So I will be navigated to the site: "https://github.com/AdorableHamster/KevinDieSeeGurke/issues"