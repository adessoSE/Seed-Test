// const {
//     Given, When, Then, Before, After, setDefaultTimeout,
// } = require('cucumber');
// const webdriver = require('selenium-webdriver');
// const { By, until } = require('selenium-webdriver');
// const { expect } = require('chai');
// require('geckodriver');
// const chrome = require('selenium-webdriver/chrome');
//
//
// // https://www.chromium.org/administrators/policy-list-3#AutoSelectCertificateForUrls
// // HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\AutoSelectCertificateForUrls\1 =
// // "{"pattern":"https://etu.daisy.bva.bund.de","filter":{"ISSUER":{"CN":"DOI CA 6"}}"
// // "{"pattern":"https://etu.daisy.bva.bund.de","filter":{"SUBJECT":{"CN":"GRP:ZfA 2"}}"
// // Cucumber default timer for timeout
// // setDefaultTimeout(20 * 1000);
// let driver;
// const chromeOptions = new chrome.Options();
// // chromeOptions.addArguments('-headless');
// // chromeOptions.addArguments('--ignore-certificate-errors');
// // chromeOptions.addArguments("user-data-dir=C:/Users/Sorna/AppData/Local/Google/Chrome/User Data/Profile 2");
// // // chromeOptions.addArguments("--start-maximized");
// chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;
// driver = new webdriver.Builder()
//     .forBrowser('chrome')
//     //.withCapabilities({'browserName': 'chrome','acceptInsecureCerts': true})
//     .setChromeOptions(chromeOptions)
//     .build();
// driver.get("https://www.google.com/");
// driver.get("https://etu.daisy.bva.bund.de/");
//
// driver.findElement(By.css(`input#anwendername`)).sendKeys("fa_wartung");
// driver.findElement(By.css(`input#passw`)).sendKeys("password");
// driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + "='"}${"anmelden"}' or ` + `${'@*' + "='"}${"anmelden"}']`)), 3 * 1000).click();
//
//
