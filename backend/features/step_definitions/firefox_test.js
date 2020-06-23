// const {
//     Given, When, Then, Before, After, setDefaultTimeout,
// } = require('cucumber');
// const webdriver = require('selenium-webdriver');
// const { By, until } = require('selenium-webdriver');
// const { expect } = require('chai');
// require('geckodriver');
// const chrome = require('selenium-webdriver/chrome');
// const firefox = require('selenium-webdriver/firefox')
//
// // HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\AutoSelectCertificateForUrls\1 =
// // "{"pattern":"https://etu.daisy.bva.bund.de","filter":{"ISSUER":{"CN":"DOI CA 6"}}"
// // "{"pattern":"https://etu.daisy.bva.bund.de","filter":{"SUBJECT":{"CN":"GRP:ZfA 2"}}"
// // Cucumber default timer for timeout
// // setDefaultTimeout(20 * 1000);
// let driver;
// const options = new firefox.Options()
// // chromeOptions.addArguments('-headless');
// // chromeOptions.addArguments('--ignore-certificate-errors');
// options.addArguments("user-data-dir=C:/Users/Sorna/AppData/Local/Google/Chrome/User Data/Profile 2");
// options.addArguments("--start-maximized");
// options.bynary_location = process.env.GOOGLE_CHROME_SHIM;
// driver = new webdriver.Builder()
//     .forBrowser('firefox')
//     .withCapabilities({'browserName': 'firefox','acceptInsecureCerts': true})
//     .setChromeOptions(options)
//     .build();
// driver.get("https://www.google.com/");
// driver.get("https://etu.daisy.bva.bund.de/");
//
