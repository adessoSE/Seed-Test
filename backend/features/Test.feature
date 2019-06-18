Feature: Test

    Scenario: PopUp & DropDown

        Given As a "Guest"

        When I want to visit this site: "https://www.lotto-bayern.de/lotto6aus49/normalschein?etcc_cmp=%28Search%29%20Allgemein%20-%20Lotto%20bayern&etcc_grp=Schein&etcc_med=SEA&etcc_par=Google&etcc_bky=lotto%20bayern%20schein&etcc_mty=b&etcc_plc=&etcc_ctv=188826613672&etcc_bde=c&etcc_var=Cj0KCQjw-tXlBRDWARIsAGYQAmeL1PGrKBd_kFxQODvTQ-AGzEePT4d9zIE8mLIYLlucJN8DOdrZYNQaAo8LEALw_wcB&gclid=Cj0KCQjw-tXlBRDWARIsAGYQAmeL1PGrKBd_kFxQODvTQ-AGzEePT4d9zIE8mLIYLlucJN8DOdrZYNQaAo8LEALw_wcB"
        When I want to click the Button: "horoscope-btn"
        When I want to click the Button: "fieldcount"
        # When I want to insert into the "dob-day" field, the value "10"
        # When I want to insert into the "dob-month" field, the value "10"
        # When I want to insert into the "dob-year" field, the value "1010"
        # When I want to click the Button: "javascript:gTicketView.layerHoroskopChance()"
        # When I want to click the Button: "error-close"

        Then So I can see in the "layer-horoskoptipp" textbox, the text "Horoskop-Tipp"