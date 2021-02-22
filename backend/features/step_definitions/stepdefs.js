const {
	Given, When, Then, Before, After, setDefaultTimeout
} = require('cucumber');
const seleniumSteps = require('../../src/execution/selenium_steps');

// Cucumber default timer for timeout
setDefaultTimeout(20 * 1000);

// runs before each scenario
Before(seleniumSteps.initDriver);

// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
});

Given('I am on the website: {string}', url => seleniumSteps.getUrl(url));


// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', url => seleniumSteps.getUrl(url));

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, waits for next page to be loaded
When('I click the button: {string}', button => seleniumSteps.clickButton(button));

// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', ms => seleniumSteps.waitMs(ms));


// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', (value, label) => seleniumSteps.fillTextField(value, label));

// "Radio"
When('I select {string} from the selection {string}', (radioname, label) => seleniumSteps.clickRadioButton(radioname, label));


// Select an Option from an dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', (value, dropd) => seleniumSteps.selectFromDropdown(value, dropd));


// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', (element, option) => seleniumSteps.hoverClick(element, option));


When('I select from the {string} multiple selection, the values {string}{string}{string}', async (button, string2, string3, string4) => {
	// TODO
});

// Check the Checkbox with a specific name or id
When('I check the box {string}', name => seleniumSteps.checkBox(name));

When('Switch to the newly opened tab', seleniumSteps.switchToNewTab);


When('Switch to the tab number {string}', numberOfTabs => seleniumSteps.switchToSpecificTab(numberOfTabs));

// TODO: delete this following step (also in DB), once every branch has the changes
When('I switch to the next tab', seleniumSteps.switchToNewTab);

// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', url => seleniumSteps.checkUrl(url));

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', (string, label) => seleniumSteps.compareTextbox(string, label));

// Search if a is text in html code
Then('So I can see the text: {string}', text => seleniumSteps.checkforText(text));


// Search a textfield in the html code and assert if it's empty
Then('So I can´t see text in the textbox: {string}', label => seleniumSteps.checkForEmptyTextbox(label));


// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', text => seleniumSteps.checkIfTextIsMissing(text));


// Closes the webdriver (Browser)
// runs after each Scenario
After(seleniumSteps.closeDriver);
