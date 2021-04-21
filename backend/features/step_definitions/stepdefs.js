const {
	Given, When, Then, Before, After, setDefaultTimeout, setWorldConstructor
} = require('@cucumber/cucumber');
const seleniumSteps = require('../../src/execution/selenium_steps');

function CustomWorld({ attach, parameters }) {
	this.attach = attach;
	this.parameters = parameters;
}


setWorldConstructor(CustomWorld);

// Cucumber default timer for timeout
setDefaultTimeout(20 * 1000);

// runs before each scenario
// Before(async function () {
// 	console.log(this.parameters.browser);
// });

Before(() => seleniumSteps.initDriver(this.parameters));

// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
});

Given('I am on the website: {string}', url => seleniumSteps.getUrl(this.parameters, url));


Given('I add a cookie with the name {string} and value {string}', (name, value) => seleniumSteps.addCookie(this.parameters, name, value));


Given('I remove a cookie with the name {string}', (name, value) => seleniumSteps.removeCookie(this.parameters, name, value));


// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', url => seleniumSteps.getUrl(this.parameters, url));

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, waits for next page to be loaded
When('I click the button: {string}', button => seleniumSteps.clickButton(this.parameters, button));

// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', ms => seleniumSteps.waitMs(ms));


// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', (value, label) => seleniumSteps.fillTextField(this.parameters, value, label));

// "Radio"
When('I select {string} from the selection {string}', (radioname, label) => seleniumSteps.clickRadioButton(this.parameters, radioname, label));


// Select an Option from an dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', (value, dropd) => seleniumSteps.selectFromDropdown(this.parameters, value, dropd));


// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', (element, option) => seleniumSteps.hoverClick(this.parameters, element, option));

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', () => {});

// Check the Checkbox with a specific name or id
When('I check the box {string}', name => seleniumSteps.checkBox(this.parameters, name));

When('Switch to the newly opened tab', () => seleniumSteps.switchToNewTab(this.parameters));


When('Switch to the tab number {string}', numberOfTabs => seleniumSteps.switchToSpecificTab(this.parameters, numberOfTabs));

// TODO: delete this following step (also in DB), once every branch has the changes
When('I switch to the next tab', () => seleniumSteps.switchToNewTab(this.parameters));

When('I want to upload the file from this path: {string} into this uploadfield: {string}',
	(path, input) => seleniumSteps.uploadFile(this.parameters, path, input));

// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', url => seleniumSteps.checkUrl(this.parameters, url));

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', (string, label) => seleniumSteps.compareTextbox(this.parameters, string, label));

// Search if a is text in html code
Then('So I can see the text: {string}', text => seleniumSteps.checkforText(this.parameters, text));


// Search a textfield in the html code and assert if it's empty
Then('So I can´t see text in the textbox: {string}', label => seleniumSteps.checkForEmptyTextbox(this.parameters, label));


Then('So a file with the name {string} is downloaded in this Directory {string}',
	(fileName, directory) => seleniumSteps.checkDownloadedFile(this.parameters, fileName, directory));

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', text => seleniumSteps.checkIfTextIsMissing(text));


// Closes the webdriver (Browser)
// runs after each Scenario
After(() => seleniumSteps.closeDriver(this.parameters));
