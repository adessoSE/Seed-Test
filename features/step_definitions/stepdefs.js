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
Given('As a {string}', function (string) {
  this.role = string
});
// driver navigates to the Website 
When('I want to visit this site: {string}', function (website) {
  driver.get(website)
});
//clicks a Button found in html code with xpath 
When('I want to click the Button: {string} identified by: {string}', async function (button, identifier) {

    driver.findElement(By.xpath("//*[@"+ identifier +"='"+ button +"']")).click().then();

    await driver.wait(function () {
      return driver.executeScript('return document.readyState').then(function (readyState) {
        return readyState === 'complete';
      });
    });
});


//TODO: change By.id to xpath to be more flexible (like button)
//Search a field in the html code and fill in the value
When('I want to insert into the {string} field, the value {string}', function (id, name) {
  driver.findElement(By.id(id)).sendKeys(name);
});
//TODO
When('I want to select from the {string} selection, the value {string}', function (identifier, cbname) {
  driver.findElement(By.xpath("//*[@"+ identifier +"='"+ cbname +"']")).click().then();
});
//TODO
When('I want to select from the {string} multiple selection, the values {string}{string}{string}', function (string, string2, string3, string4) {
  let quatsch = string
});
//TODO:change By.tagName to xpath for flexibility
//Search a Textfield in the html code and asert it with a Text
Then('So I can see in the {string} textbox, the text {string}', function (label, string) {

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
// AfterAll(async function () {
//   return driver.quit();
// });


