Feature: Access scenario

    Scenario: successful Authentication

        Given As a "User"

        When I want to visit this site: "https://www.gamestar.de"
        When I want to click the Button: "Forum"

        Then So I will be navigated to the site: "https://www.gamestar.de/xenforo/"

