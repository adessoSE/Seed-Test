// const webdriver = require('selenium-webdriver');
// const { By, until, Key } = require('selenium-webdriver');
// require('geckodriver');
// const chrome = require('selenium-webdriver/chrome');
//
//
// let driver;
// const chromeOptions = new chrome.Options();
// // chromeOptions.addArguments('--headless');
// chromeOptions.addArguments('--ignore-certificate-errors');
// chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;
//
// driver = new webdriver.Builder()
//     .forBrowser('chrome')
//     .setChromeOptions(chromeOptions)
//     .build();
//
// test(driver)
// function test(driver){
//     driver.get('https://etu.daisy.bva.bund.de/');
//     driver.findElement(By.css(`input#${"anwendername"}`)).clear();
//     driver.findElement(By.css(`input#${"anwendername"}`)).sendKeys("FA_Wartung_seed");
//     driver.findElement(By.css(`input#${"passw"}`)).clear();
//     driver.findElement(By.css(`input#${"passw"}`)).sendKeys("password-");
//     driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + "='"}${"anmelden"}' or ` + `${'@*' + "='"}${"anmelden"}']`)), 3 * 1000).click();
//     driver.sleep(parseInt("3000"));
//
//     let button = "DSDANWENDUNG"
//     driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + "='"}${button}' or ` + `${'@*' + "='"}${button}']`)), 3 * 1000).click();
//     driver.get('https://etu.daisy.bva.bund.de/dsd/app/pruefungsschulenAktivierenFlow');
//     // driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
//     driver.sleep(parseInt("3000"));
//     let dropd = "inhaltsbereichForm:j_idt286:j_idt337:pruefungsschuleSuchkriterien-schultyp_selectDropdown"
//     let value = "DAS";
//     let dropdwn = driver.wait(until.elementLocated(By.id(dropd)));
//     console.log(dropdwn);
//     driver.wait(until.elementLocated(By.xpath(`//*[@id='${dropd}']/option[text()='${value}']`)), 3 * 1000).click();
// }
//
