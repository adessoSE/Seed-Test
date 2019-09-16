Feature: SignUpTest scenario

    Scenario: successful Sign Up

        Given As a "User"

        When I want to visit this site: "https://forum.golem.de/register.php?121624"
        When I want to click the Button: "golemAcceptCookies();"
        When I want to insert into the "reg-username" field, the value 'abcdefgh1234567890'
        When I want to insert into the "reg-email" field, the value "telefonnummer@gmail.com"
        When I want to insert into the "reg-password" field, the value "cucumber2000"
        When I want to insert into the "reg-password2" field, the value "cucumber2000"
        When I want to select from the "name" selection, the value "tos_accept"
        When I want to click the Button: "submit"

        Then So I will be navigated to the website: "https://forum.golem.de/register.php?121624"