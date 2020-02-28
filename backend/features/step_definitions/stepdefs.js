const {
  Given, When, Then, Before, After, setDefaultTimeout,
} = require('cucumber');
const webdriver = require('selenium-webdriver');
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
require('geckodriver');
const chrome = require('selenium-webdriver/chrome');

// Cucumber default timer for timeout
setDefaultTimeout(20 * 1000);
let driver;
const chromeOptions = new chrome.Options();
chromeOptions.addArguments('-headless');
chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;


// Starts the driver / Browser
Before(() => { // runs before each scenario
  driver = new webdriver.Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
});

// #################### GIVEN ########################################
// TODO: implement functionality (Login or no Login required), maybe irrelevant with background
Given('As a {string}', async function (string) {
  this.role = string;
});

Given('I am on the website: {string}', async (url) => {
  await driver.get(url);
  await driver.getCurrentUrl().then(async (currentUrl) => {
    expect(currentUrl).to.equal(url, 'Error');
  });
});

// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async (url) => {
  await driver.get(url);
  await driver.getCurrentUrl().then(async (currentUrl) => {
    expect(currentUrl).to.equal(url, 'Error');
  });
});

// clicks a button if found in html code with xpath, timeouts if not found after 3 sek, waits for next page to be loaded
When('I click the button: {string}', async (button) => {
  await driver.wait(until.elementLocated(By.xpath(`${'//*[@*' + "='"}${button}']`)), 3 * 1000).click();
  // if you get navigeted to another Website and want to check wether you reach the correct Site we may need this to wait for the new page
  await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
});

// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', async (value, label) => {
  await driver.findElement(By.css(`input#${label}`)).sendKeys(value);
});

When('I insert {string} into the field{string}', async (value, label) => {
  await driver.findElement(By.css(`input#${label}`)).sendKeys(value);
});

// TODO: Date

// "Radio"
When('I select {string} from the selection {string}', async (radioname, label) => {
  await driver.wait(until.elementLocated(By.xpath(`//*[@${label}='${radioname}']`)), 3 * 1000).click();
});

// Select an Option from an dropdown-menue
When('I select the option {string} from the drop-down-menue {string}', async function (value, dropd) {
  await driver.wait(until.elementLocated(By.xpath("//*[@id='" + dropd + "']/option[text()='" + value + "']")), 3 * 1000).click();
});

// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function(element, option) {
  const action = driver.actions({bridge: true});
  const link = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'" + element + "')]")), 3 * 1000);
  await action.move({x: 0, y: 0, origin: link}).perform();

  const action2 = driver.actions({bridge: true});
  const selection = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'" + option + "')]")), 3 * 1000);
  await action2.move({x: 0, y: 0, origin: selection}).click().perform();
});

// TODO: Multiple Selection OR: copy the radio/button multiple times
When('I select from the {string} multiple selection, the values {string}{string}{string}', async (string, string2, string3, string4) => {
});

// ################### THEN ##########################################
// Search a textfield in the html code and asert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async (string, label) => {
  await driver.wait(until.elementLocated(By.xpath(`${'//*[@*' + "='"}${label}']`)), 3 * 1000).then(async (link) => {
    const resp = await link.getText().then(text => text);
    expect(string).to.equal(resp, 'Error');
  });
});

// Checks if the current Website is the one it is suposed to be
Then('So I will be navigated to the website: {string}', async (url) => {
  await driver.getCurrentUrl().then(async (currentUrl) => {
    expect(currentUrl).to.equal(url, 'Error');
  });
});

Then('So I can´t see text in the textbox: {string} anymore' , async (label) => {
  await driver.wait(until.elementLocated(By.xpath(`${'//*[@*' + "='"}${label}']`)), 3 * 1000).then(async (link) => {
    const resp = await link.getText().then(text => text);
    expect('').to.equal(resp, 'Error');
  });
});

Then('So I can\'t see the text: {string}', async (string) => {
  await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
    const text = await body.getText().then(bodytext => bodytext);
    expect(text.toLowerCase()).to.not.include(string.toString().toLowerCase(), 'Error');
  });
});


// Closes the webdriver (Browser)
After(async () => { // runs after each Scenario
  // // TODO: check for heroku and Chrome
  // // Without Timeout driver quit is happening too quickly. Need a better solution
  //https://github.com/SeleniumHQ/selenium/issues/5560
  const condition = until.elementLocated(By.name('loader'))
  driver.wait(async drive => condition.fn(drive), 1000, 'Loading failed.')
  //driver.wait(1000);
  driver.quit();
});
