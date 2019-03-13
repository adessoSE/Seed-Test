Feature: SignUpTest scenario

    Scenario: successful Sign Up

        Given As a "User"

        When I want to visit this site: "https://eu.wargaming.net/registration/de/?utm_campaign=cmenu_direct&sid=SIDy_jhwwxjoePR7dUtmzFkZRag4c9pHyoQuiXlKMsZlRZXVXHE4s4EzHVT42cqHn-nIKGvm_ZgDeURgExR2_iih_KSc166QLbJ8sT3VOZ0aXnlbvm3M3inPTfJi63a5S1iZBg0JmkYZzq2Uk6EXF_S9RrC8XLrOzj5i_4myS-vTCZvoR2E41qtV_ayfo2fvACQiKXO&utm_medium=5232&utm_source=wotcpu&lpsn=WGN+Reg+Full+EU"
        When I want to insert into the "id_login" field, the value 'tit84299@jaqis.com'
        When I want to insert into the "id_name" field, the value "Cucumberidiots"
        When I want to insert into the "id_password" field, the value "Gurke123"
        When I want to insert into the "id_re_password" field, the value "Gurke123"
        When I want to select from the "checkbox-game-label" selection, the value "test"
        When I want to click the Button: "b-big-button"



        Then So I will be navigated to the site: "https://eu.wargaming.net/registration/de/?utm_campaign=cmenu_direct&sid=SIDy_jhwwxjoePR7dUtmzFkZRag4c9pHyoQuiXlKMsZlRZXVXHE4s4EzHVT42cqHn-nIKGvm_ZgDeURgExR2_iih_KSc166QLbJ8sT3VOZ0aXnlbvm3M3inPTfJi63a5S1iZBg0JmkYZzq2Uk6EXF_S9RrC8XLrOzj5i_4myS-vTCZvoR2E41qtV_ayfo2fvACQiKXO&utm_medium=5232&utm_source=wotcpu&lpsn=WGN+Reg+Full+EU"
