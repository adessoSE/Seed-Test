const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
require('geckodriver');
// require('chromedriver');

var { setDefaultTimeout } = require('cucumber');
setDefaultTimeout(20 * 1000);

const driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();


// Github test Acc:
// Username: AdorableHamster  
// EMail: adorable@hamster.com
// Psw: cutehamsterlikesnuts2000

// Tutorial
function isItFriday(today) {
  if (today === "Friday") {
    return "TGIF";
  } else {
    return "Nope";
  }
}

// Tutorial
Given('today is {string}', function (givenDay) {
  this.today = givenDay;
});

Given('As a {string}', function (string) {
  this.role = string
});

// Tutorial
When('I ask whether it\'s Friday yet', function () {
  this.actualAnswer = isItFriday(this.today);
});

When('I want to visit this site: {string}', function (website) {
  driver.get(website)
});

When('I want to click the Button: {string}', async function (button) {
  // driver.findElement(By.xpath("//a[text()=" + button + "]")).click().then();

  driver.findElement(By.xpath("//*[@href='/xenforo/']")).click().then();

  await driver.wait(function () {
    return driver.executeScript('return document.readyState').then(function (readyState) {
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

// Tutorial
Then('I should be told {string}', function (expectedAnswer) {
  assert.equal(this.actualAnswer, expectedAnswer);
});

Then('So I can see in the {string} textbox, the text {string}', function (label, string) {

  driver.findElement(By.tagName(label)).then(function (link) {
    link.getText().then(function (text) {
      assert.equal(string, text);
    }).catch(function (error) {
      console.log(error)
    })
  });
});

When('I want to select from the {string} multiple selection, the values {string}{string}{string}', function (string, string2, string3, string4) {
  let quatsch = string
});

Then('So I will be navigated to the site: {string}', async function (string) {


  driver.getCurrentUrl().then(async function (currentUrl) {
    console.log('URL --------------------------' + currentUrl)

    expect(currentUrl).to.equal(string, 'Error');
  })

});

// driver.quit();
