const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
var { AfterAll, BeforeAll } = require('cucumber')
require('geckodriver');

//Cucumber defaulttimer for timeout
var { setDefaultTimeout } = require('cucumber');
setDefaultTimeout(20 * 1000);

//Starts the driver/Webbrowser
BeforeAll(async function () {
  driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();
});



// Github test Acc:
// Username: AdorableHamster 
// EMail: adorable@hamster.com
// Psw: cutehamsterlikesnuts2000


// TODO: has no Meaning yet
Given('As a {string}', async function (string) {
  this.role = string
});
// driver navigates to the Website 
When('I want to visit this site: {string}', async function (website) {
  await driver.get(website)
});
//clicks a Button found in html code with xpath 
When('I want to click the Button: {string} identified by: {string}', async function (button, identifier) {

  await driver.findElement(By.xpath("//*[@" + identifier + "='" + button + "']"))
    .click().then()

  // if you get navigeted to another Website and want to check wether you reach the correct Site we may need this to wait for the new page
  await driver.wait(async function () {
    return driver.executeScript('return document.readyState').then(async function (readyState) {
      return readyState === 'complete';
    });
  });
});

//TODO: change By.id to xpath to be more flexible (like button)
//Search a field in the html code and fill in the value
When('I want to insert into the {string} field, the value {string}', async function (id, name) {
  driver.findElement(By.id(id)).sendKeys(name);
});
//TODO

When('I want to select from the {string} selection, the value {string}', async function (identifier, cbname) {
  var wait = driver.wait(until.elementLocated(By.xpath("//*[@" + identifier + "='" + cbname + "']")), 6 * 1000)
  await wait.click()
});

//TODO
When('I want to select from the {string} multiple selection, the values {string}{string}{string}', async function (string, string2, string3, string4) {
  let quatsch = string
});

//TODO:change By.tagName to xpath for flexibility
//Search a Textfield in the html code and asert it with a Text
Then('So I can see in the {string} textbox, the text {string}', async function (label, string) {

  driver.findElement(By.tagName(label)).then(function (link) {
    link.getText().then(function (text) {
      assert.equal(string, text);
    }).catch(function (error) {
      console.log(error)
    })
  });
});
//Checks if the current Website is the one it is suposed to be
Then('So I will be navigated to the site: {string}', async function (string) {

  driver.getCurrentUrl().then(async function (currentUrl) {
    console.log('URL --------------------------' + currentUrl)

    expect(currentUrl).to.equal(string, 'Error');
  })

});
//Closes the webdriver (Browser)
AfterAll(async function () {
  return driver.quit();
 });


