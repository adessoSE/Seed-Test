const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const By = webdriver.By
const { expect } = require('chai');
require('geckodriver');

const driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();


// Github test Acc:
// Username: AdorableHamster  
// EMail: adorable@hamster.com
// Psw: cutehamsterlikesnuts2000

function isItFriday(today) {
  if (today === "Friday") {
    return "TGIF";
  } else {
    return "Nope";
  }
}


Given('today is {string}', function (givenDay) {
  this.today = givenDay;
});

Given('As a {string}', function (string) {
  this.role = string
});

When('I ask whether it\'s Friday yet', function () {
  this.actualAnswer = isItFriday(this.today);
});

When('I want to visit this site: {string} {string}', function (string, website) {
  driver.get(website)
});

When('I want to click the Button: {string}', async function (button) {
  driver.findElement(By.name(button)).click().then();
  await driver.wait(function() {
    return driver.executeScript('return document.readyState').then(function(readyState) {
      return readyState === 'complete';
    });
  });

});


When('I want to insert into the {string} field, the value {string}', function (id, name) {
  driver.findElement(By.id(id)).sendKeys(name);
});

When('I want to select from the {string} selection, the value {string}', function (string, string2) {
  driver.findElement(By.xpath("//label[contains(@classname, 'string')]")).click();
});

Then('I should be told {string}', function (expectedAnswer) {
  assert.equal(this.actualAnswer, expectedAnswer);
});

Then('So I will be navigated to the site: {string}', function (string) {
  
  driver.getCurrentUrl().then(function(currentUrl) {
    console.log('URL --------------------------' + currentUrl)
    
    expect(currentUrl).to.equal(string, 'Error');
})
 
});
