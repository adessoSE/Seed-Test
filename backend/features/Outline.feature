Feature: LoginTest

    Scenario Outline: successful Login

        Given As a "Guest"

        When I want to visit this site: "https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"
        When I want to insert into the "login_field" field, the value "<userName>"
        When I want to insert into the "password" field, the value "<password>"
        When I want to click the Button: "commit"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke"
        When I want to click the Button: "/AdorableHamster/KevinDieSeeGurke/issues"
        When I want to select from the "aria-label" selection, the value "Select all issues"
        When I want to select from the "aria-labelledby" selection, the value "issue_2_link"

    Examples:
        | userName | password |
        | AdorableHamster | cutehamsterlikesnuts2000 |
        | NormalHamster | normalHamster123 |
        | BabyHamster | babyHamster123 |