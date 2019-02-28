const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const webdriver = require('selenium-webdriver')
const By = webdriver.By

const driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.firefox()).build();

// driver.get('https://www.gamestar.de/')

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

  Given('As a User ', function () {
    
  });
  
  When('I ask whether it\'s Friday yet', function () {
    this.actualAnswer = isItFriday(this.today);
  });

  When('I want to visit this site: Website  www.mjdiaries.com', function () {
    
  });

  When('I want to click the Button: {string}', function () {
   
  });

  When('I want to insert into the Username field, the value text Spiderman', function () {
   
  });
  
  When('I want to insert into the Password field, the value text MaryJane', function () {
   
  });

  Then('I should be told {string}', function (expectedAnswer) {
    assert.equal(this.actualAnswer, expectedAnswer);
  });

  Then('So I will be navigated to: Website  {string}', function () {
    
  });

  Then('So i can see in  the User not allowed textbox, the text You dont have ther permission to enter the forum!', function () {
   
  });