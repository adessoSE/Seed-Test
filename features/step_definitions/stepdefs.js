const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const { By, until, } = require('selenium-webdriver');
const { expect } = require('chai');
var { AfterAll, BeforeAll, Before, After } = require('cucumber')
require('geckodriver');
var firefox = require('selenium-webdriver/firefox');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver')


//Cucumber defaulttimer for timeout
setDefaultTimeout(20 * 1000);


//Starts the driver/Webbrowser
Before(async function () {
    let options = new firefox.Options();
    options.addArguments("-headless");

    let chromeOptions = new chrome.Options();
    chromeOptions.addArguments("-headless");

    //driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(options).build();
    driver = new webdriver.Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

    // let logger = webdriver.logging.getLogger();
    // logger.setLevel(webdriver.WebDriver.Level.DEBUG);
    // webdriver.logging.installConsoleHandler();
});


// TODO: has no meaning yet
Given('As a {string}', async function (string) {
    this.role = string
});

Given('I am at the Website: {string}', async function (url){
  await driver.get(url)
  await driver.getCurrentUrl().then(async function (currentUrl) {
    expect(currentUrl).to.equal(url, 'Error');
  })
})

// driver navigates to the Website
When('I want to visit this site: {string}', async function (url) {
    await driver.get(url);
    await driver.getCurrentUrl().then(async function (currentUrl) {
        expect(currentUrl).to.equal(url, 'Error');
    })
});

//clicks a button if found in html code with xpath, timeouts if not found after 6 sek, waits for next page to be loaded
When('I want to click the Button: {string}', async function (button) {

  await driver.findElement(By.xpath("//*[@*" + "='" + button + "']")).then(function (webElement) {
    console.log("Element exists");
    driver.findElement(By.xpath("//*[@*" + "='" + button + "']")).click();
  }, async function (onErr) {
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'" + button + "')]")), 3 * 1000).click()
  })


  // if you get navigeted to another Website and want to check wether you reach the correct Site we may need this to wait for the new page
  await driver.wait(async function () {
    return driver.executeScript('return document.readyState').then(async function (readyState) {
      return readyState === 'complete';
    });
});

//Search a field in the html code and fill in the value
When('I want to insert into the {string} field, the value {string}', async function (label, value) {
  await driver.findElement(By.css("input#" + label)).sendKeys(value);
});

//TODO Date

// Single checkbox
When('I want to select from the {string} selection, the value {string}', async function (label, cbname) {
  let radio = await driver.findElement(By.xpath("//*[@'" + cbname + "']"))
  radio.click()
});


//Select an Option from an Dropdownmenue
When ('I want to select from the dropdownmenue {string}, the option {string}', async function (dropd, value) {
  await driver.wait(until.elementLocated(By.xpath("//*[@id='" + dropd + "']/option[text()='" + value + "']")), 3 * 1000).click();
});

//Hover over element and Select an Option
When ('I want to hover over the Element {string}, and Select the Option {string}', async function(element, option) {
  const action = driver.actions({bridge: true});
  const link = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'" + element + "')]")), 3 * 1000)
  await action.move({x: 0, y: 0, origin: link}).perform();

  const action2 = driver.actions({bridge: true});
  const selection = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'" + option + "')]")), 3 * 1000)
  await action2.move({x: 0, y: 0, origin: selection}).click().perform();
});

//TODO
When('I want to select from the {string} multiple selection, the values {string}{string}{string}', async function (string, string2, string3, string4) {
    let quatsch = string
});

//Search a Textfield in the html code and asert it with a Text
Then('So I can see in the {string} textbox, the text {string}', async function (label, string) {
 await driver.wait(until.elementLocated(By.xpath("//*[@*"+ "='" + label + "']")), 3 * 1000).then(async function (link) {
    var resp = await link.getText().then(function (text) {
        return text;
      });
      expect(resp).to.contain(string, 'Error')
    })
});

//Checks if the current Website is the one it is suposed to be
Then('So I will be navigated to the site: {string}', async function (url) {
  await driver.getCurrentUrl().then(async function (currentUrl) {
    expect(currentUrl).to.equal(url, 'Error');
  })
});

//Closes the webdriver (Browser)
// After(async function () {
//   driver.quit();
// });
