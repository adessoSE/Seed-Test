const os = require('os');
const {
	Given, When, Then, Before, After, setDefaultTimeout, setWorldConstructor, defineParameterType
} = require('@cucumber/cucumber');
const { expect } = require('chai');
const fs = require('fs');
const { match, doesNotMatch } = require('assert');
const webdriver = require('../../node_modules/selenium-webdriver');
const { By, until, Key } = require('../../node_modules/selenium-webdriver');
require('geckodriver');
const firefox = require('../../node_modules/selenium-webdriver/firefox');
const chrome = require('../../node_modules/selenium-webdriver/chrome');
const edge = require('../../node_modules/selenium-webdriver/edge');
const { applySpecialCommands } = require('../../src/serverHelper');

let driver;

const downloadDirectory = !(/^win/i.test(process.platform)) ? '/home/public/Downloads/' : 'C:\\Users\\Public\\seed_Downloads\\';
if (!fs.existsSync(downloadDirectory)) fs.mkdirSync(downloadDirectory, { recursive: true });
const firefoxOptions = new firefox.Options().setPreference('browser.download.dir', downloadDirectory)
	.setPreference('browser.download.folderList', 2) // Set to 2 for the "custom" folder
	.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/octet-stream');
const chromeOptions = new chrome.Options().setUserPreferences({ 'download.default_directory': downloadDirectory });
const edgeOptions = new edge.Options().setUserPreferences({ 'download.default_directory': downloadDirectory });

if (!os.platform().includes('win')) {
	chromeOptions.addArguments('--headless');
	chromeOptions.addArguments('--no-sandbox');
	firefoxOptions.addArguments('--headless');
	edgeOptions.addArguments('--headless');
	edgeOptions.addArguments('--no-sandbox');
}

chromeOptions.addArguments('--disable-dev-shm-usage');
// chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--ignore-certificate-errors');
chromeOptions.addArguments('--start-maximized');
chromeOptions.addArguments('--lang=de');
chromeOptions.addArguments('--excludeSwitches=enable-logging');
edgeOptions.addArguments('--disable-dev-shm-usage');
edgeOptions.addArguments('--ignore-certificate-errors');
edgeOptions.addArguments('--start-maximized');
edgeOptions.addArguments('--lang=de');
edgeOptions.addArguments('--excludeSwitches=enable-logging');
// chromeOptions.addArguments('--start-fullscreen');

chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;
let currentParameters = {};

const NotFoundError = (e) => Error(`ElementNotFoundError: ${e}`);

function CustomWorld({ attach, parameters }) {
	this.attach = attach;
	this.parameters = parameters;
}
let scenarioIndex = 0;
let testLength;
const searchTimeout = 15000;

setWorldConstructor(CustomWorld);

// Cucumber default timer for timeout
setDefaultTimeout(30 * 1000);

defineParameterType({
	name: 'Bool',
	regexp: /true|false/,
	transformer: (b) => (b === 'true')
});

Before(async function () {
	testLength = this.parameters.scenarios.length;
	currentParameters = this.parameters.scenarios[scenarioIndex];

	if (currentParameters.emulator !== undefined) switch (currentParameters.browser) {
		case 'chrome':
			chromeOptions.setMobileEmulation({ deviceName: currentParameters.emulator });
			break;
		case 'MicrosoftEdge':
			edgeOptions.setMobileEmulation({ deviceName: currentParameters.emulator });
			break;
		case 'firefox':
		// no way to do it ?
	}

	if (currentParameters.windowSize !== undefined) switch (currentParameters.browser) {
		case 'chrome':
			chromeOptions.windowSize(currentParameters.windowSize);
			break;
		case 'MicrosoftEdge':
			edgeOptions.windowSize(currentParameters.windowSize);
			break;
		case 'firefox':
			firefoxOptions.windowSize(currentParameters.windowSize);
			break;
		default:
			console.error(`Unsupported browser: ${currentParameters.browser}`);
			break;
	}
	else console.error('Invalid width or height values');

	if (currentParameters.oneDriver) {
		if (currentParameters.oneDriver === true) if (driver) console.log('OneDriver');
		else driver = new webdriver.Builder()
			.forBrowser(currentParameters.browser)
			.setChromeOptions(chromeOptions)
			.build();
	} else driver = new webdriver.Builder()
		.forBrowser(currentParameters.browser)
		.setChromeOptions(chromeOptions)
		.setFirefoxOptions(firefoxOptions)
		.setEdgeOptions(edgeOptions)
		.build();
});

// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
	// await driver.sleep(100 + currentParameters.waitTime);
});

Given('I am on the website: {string}', async function getUrl(url) {
	const world = this;
	try {
		await driver.get(url);
		await driver.getCurrentUrl();
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

Given('I add a cookie with the name {string} and value {string}', async function addCookie(name, value) {
	const world = this;
	try {
		await driver.manage().addCookie({ name, value });
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

Given('I remove a cookie with the name {string}', async function removeCookie(name) {
	const world = this;
	try {
		await driver.manage().deleteCookie(name);
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

Given('I add a session-storage with the name {string} and value {string}', async function addSessionStorage(name, value) {
	const world = this;
	try {
		await driver.executeScript(`window.sessionStorage.setItem('${name}', '${value}');`);
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

Given('I remove a session-storage with the name {string}', async function addSessionStorage(name) {
	const world = this;
	try {
		await driver.executeScript(`window.sessionStorage.removeItem('${name}');`);
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// Take a Screenshot
Given('I take a screenshot', async function () {
	const world = this;
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async (readyState) => readyState === 'complete'));
	try {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// Take a Screenshot and optionally scroll to a specific element
Given('I take a screenshot. Optionally: Focus the page on the element {string}', async function takeScreenshot(element) {
	const world = this;
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async (readyState) => readyState === 'complete'));
	const identifiers = [`//*[@id='${element}']`, `//*[@*='${element}']`, `//*[contains(@id, '${element}')]`, `${element}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.executeScript('arguments[0].scrollIntoView(true);', driver.findElement(By.xpath(idString))));

	await Promise.any(promises)
		.then(async () => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Element ${element} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async function getUrl(url) {
	const world = this;
	try {
		await driver.get(url);
		await driver.getCurrentUrl();
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function clickButton(button) {
	const world = this;
	const identifiers = [`//*[@id='${button}']`, `//*[contains(@id,'${button}')]`, `//*[text()='${button}' or @*='${button}']`, `//*[contains(text(),'${button}')]`, `${button}`];
	await driver.getCurrentUrl()
		.then(async (currentUrl) => {
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
		});
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

	await Promise.any(promises)
		.then((elem) => elem.click())
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Button ${button} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', async function (ms) {
	const world = this;
	try {
		await driver.sleep(parseInt(ms, 10));
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
});

// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', async function fillTextField(value, label) {
	const world = this;
	const identifiers = [`//input[@id='${label}']`, `//input[contains(@id,'${label}')]`, `//textarea[@id='${label}']`, `//textarea[contains(@id,'${label}')]`,
	`//textarea[@*='${label}']`, `//textarea[contains(@*='${label}')]`, `//*[@id='${label}']`, `//input[@type='text' and @*='${label}']`,
	`//label[contains(text(),'${label}')]/following::input[@type='text']`, `${label}`];

	if (value.includes('@@')) value = applySpecialCommands(value);

	const promises = [];
	for (const idString of identifiers) promises.push(
		driver.wait(until.elementLocated((By.xpath(idString))), searchTimeout, 100)
	);

	await Promise.any(promises)
		.then(async (elem) => {
			await elem.clear();
			await elem.sendKeys(value);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Input/Textarea ${label} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// "Radio"
When('I select {string} from the selection {string}', async function clickRadioButton(radioname, label) {
	const world = this;
	const identifiers = [`//input[@${label}='${radioname}']/following-sibling::label[1]`, `//input[contains(@${label}, '${radioname}')]/following-sibling::label[1]`, `//label[contains(text(), '${label}')]/following::input[@value='${radioname}']/following-sibling::label[1]
	`, `//input[@name='${label}' and @value='${radioname}']/following-sibling::label[1]`, `//input[contains(@*,'${label}')]/following-sibling::label[contains(text(), '${radioname}')]`, `${radioname}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

	await Promise.any(promises)
		.then((elem) => elem.click())
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Radio ${label} with option ${radioname} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// Select an Option from a dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function (value, dropd) {
	const world = this;
	const identifiers = [`//*[@*='${dropd}']/option[text()='${value}']`, `//label[contains(text(),'${dropd}')]/following::button[text()='${value}']`,
	`//label[contains(text(),'${dropd}')]/following::span[text()='${value}']`, `//*[contains(text(),'${dropd}')]/following::*[contains(text(),'${value}']`, `//*[@role='listbox']//*[self::li[@role='option' and text()='${value}'] or parent::li[@role='option' and text()='${value}']]`,
	`${dropd}//option[contains(text(),'${value}') or contains(@id, '${value}') or contains(@*,'${value}')]`];
	const promises = identifiers.map((idString) => driver.wait(
		until.elementLocated(By.xpath(idString)),
		searchTimeout,
		`Timed out after ${searchTimeout} ms`,
		100
	));

	await Promise.any(promises)
		.then((elem) => elem.click())
		.catch(async (e) => {
			const ariaProm = [driver.findElement(By.xpath(`//*[contains(text(),"${dropd}") or contains(@id, "${dropd}") or contains(@*, "${dropd}")]`)), driver.findElement(By.xpath(`${dropd}`))];
			const dropdownElement = await Promise.any(ariaProm);
			await dropdownElement.click();

			const ariaOptProm = [driver.findElement(By.xpath(`(//*[contains(text(),'${value}') or contains(@id, '${value}') or contains(@*, '${value}')]/option) | (//*[@role='listbox']//*[ancestor::*[@role='option']//*[contains(text(),'${value}')]])
			`)), driver.findElement(By.xpath(`${value}`))];
			const dropdownOption = await Promise.any(ariaOptProm).catch((e) => { throw e; });

			// Wait for the dropdown options to be visible
			await driver.wait(until.elementIsVisible(dropdownOption)).catch((e) => { throw e; });

			// Select the option from the dropdown
			await dropdownOption.click();
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Dropdown ${dropd} with option ${value} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(currentParameters.waitTime);
});

// Dropdown via XPath:
When('I select the option {string}', async function selectviaXPath(dropd) {
	const world = this;
	try {
		await driver.wait(until.elementLocated(By.xpath(`${dropd}`)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100).click();
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		if (Object.keys(e).length === 0) throw NotFoundError(`Dropdown-option ${dropd} could not be found!`);
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function hoverClick(element, option) {
	const world = this;
	// do not set this too high, because the first and second try - catch can timeout
	const maxWait = 2000;
	const waitText = `Timed out after ${searchTimeout} ms`;
	const waitRetryTime = 100;
	try {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`${element}`)), maxWait, waitText, waitRetryTime);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(500);
		const action2 = driver.actions({ bridge: true });
		const selection = await driver.wait(until.elementLocated(By.xpath(`${option}`)), maxWait, waitText, waitRetryTime);
		await action2.move({ origin: selection }).click()
			.perform();
	} catch (e) {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), maxWait, waitText, waitRetryTime);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(500);
		const action2 = driver.actions({ bridge: true });
		try {
			const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`)), maxWait, waitText, waitRetryTime);
			await action2.move({ origin: selection }).click()
				.perform();
		} catch (e2) {
			try {
				const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), maxWait, waitText, waitRetryTime);
				await action2.move({ origin: selection }).click()
					.perform();
			} catch (e3) {
				await driver.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Selector ${element} could not be found!`);
				throw Error(e);
			}
		}
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', async () => { });

// Check the Checkbox with a specific name or id
When('I check the box {string}', async function checkBox(name) {
	// Some alternative methods to "check the box":
	// await driver.executeScript("arguments[0].submit;",
	// driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.executeScript("arguments[0].click;",
	// driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.wait(until.elementLocated(
	// By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).submit();
	// await driver.wait(until.elementLocated(
	// By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).click();
	const world = this;
	// const identifiers = [`//*[@type="checkbox" and @*="${name}"]`, `//*[contains(text(),'${name}')]//parent::label`, `//*[contains(text(),'${name}') or @*='${name}']`, `${name}`]
	const maxWait = searchTimeout;
	const waitText = `Timed out after ${searchTimeout} ms`;
	const waitRetryTime = 100;
	const promises = [
		driver.wait(until.elementLocated(By.xpath(`//*[@type="checkbox" and @*="${name}"]`)), maxWait, waitText, waitRetryTime).sendKeys(Key.SPACE),
		driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${name}')]//parent::label`)), maxWait, waitText, waitRetryTime).click(),
		driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${name}') or @*='${name}']`)), maxWait, waitText, waitRetryTime).click(),
		driver.wait(until.elementLocated(By.xpath(`${name}`)), maxWait, waitText, waitRetryTime).click()
	];
	await Promise.any(promises)
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`checkbox ${name} could not be found!`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

When('Switch to the newly opened tab', async function switchToNewTab() {
	const world = this;
	try {
		const tabs = await driver.getAllWindowHandles();
		await driver.switchTo().window(tabs[1]);
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

When('Switch to the tab number {string}', async function switchToSpecificTab(numberOfTabs) {
	const world = this;
	try {
		const chromeTabs = await driver.getAllWindowHandles();
		const len = chromeTabs.length;
		if (parseInt(numberOfTabs, 10) === 1) {
			console.log('switchTo: 1st tab');
			await driver.switchTo().window(chromeTabs[0]);
		} else {
			const tab = len - (parseInt(numberOfTabs, 10) - 1);
			await driver.switchTo().window(chromeTabs[tab]);
		}
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// TODO: delete this following step (also in DB), once every branch has the changes
When('I switch to the next tab', async function switchToNewTab() {
	const world = this;
	try {
		const tabs = await driver.getAllWindowHandles();
		await driver.switchTo().window(tabs[1]);
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

When(
	'I want to upload the file from this path: {string} into this uploadfield: {string}',
	async function uploadFile(file, input) {
		const world = this;
		const identifiers = [`//input[@*='${input}']`, `${input}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
		const path = !(/^win/i.test(process.platform)) ? `/home/public/seedExec/${file}` : `C:\\Users\\Public\\seedExec\\${file}`;
		await Promise.any(promises)
			.then((elem) => elem.sendKeys(`${path}`))
			.catch(async (e) => {
				await driver.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Upload Field ${input} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	}
);

// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', async function checkUrl(url) {
	const world = this;
	try {
		await driver.getCurrentUrl().then(async (currentUrl) => {
			expect(currentUrl).to.equal(url, 'Error');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

const resolveRegex = (rawString) => {
	// undefined to empty string
	rawString = !rawString ? '' : rawString;
	const regex = /(\{Regex:)(.*)(\})(.*)/g;
	const regexFound = regex.test(rawString);
	const resultString = regexFound ? rawString.replace(regex, '$2$4') : rawString;
	return { resultString, regexFound };
};

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async function checkForTextInField(expectedText, label) {
	expectedText = applySpecialCommands(expectedText.toString());
	const { resultString, regexFound } = resolveRegex(expectedText);

	const world = this;

	const identifiers = [`//*[@id='${label}']`, `//*[@*='${label}']`, `//*[contains(@*, '${label}')]`,
	`//label[contains(text(),'${label}')]/following::input[@type='text']`, `${label}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

	await Promise.any(promises)
		.then(async (elem) => {
			let resp = await elem.getText();
			resp = resp == '' ? await elem.getAttribute('value') : resp;
			resp = resp == '' ? await elem.getAttribute('outerHTML') : resp;
			if (regexFound) match(resp, RegExp(resultString), `Textfield does not contain the string/regex: ${resultString} , actual: ${resp}`);
			else expect(resp).to.equal(resultString, `Textfield does not contain the string: ${resultString}`);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// Search if a is text in html code
Then('So I can see the text: {string}', async function textPresent(expectedText) { // text is present
	expectedText = applySpecialCommands(expectedText.toString());
	const { resultString, regexFound } = resolveRegex(expectedText);
	const world = this;
	try {
		await driver.wait(async () => driver.executeScript('return document.readyState').then(async (readyState) => readyState === 'complete'));
		await driver.wait(until.elementLocated(By.css('Body')), searchTimeout)
			.then(async (body) => {
				const cssBody = await body.getText().then((bodytext) => bodytext);
				const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
				const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
				const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
				if (regexFound) match(bodyAll, RegExp(resultString), `Page HTML does not contain the string/regex: ${resultString}`);
				else expect(bodyAll).to.contain(resultString, `Page HTML does not contain the string/regex: ${resultString}`);
			});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// Search a textfield in the html code and assert if it's empty
Then('So I can\'t see text in the textbox: {string}', async function textAbsent(label) {
	const world = this;
	const identifiers = [`//*[@id='${label}']`, `//*[@*='${label}']`, `//*[contains(@id, '${label}')]`, `${label}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

	await Promise.any(promises)
		.then(async (elem) => {
			const resp = await elem.getText().then((text) => text);
			expect(resp).to.equal('', 'Textfield does contain some Text');
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
	await driver.takeScreenshot().then(async (buffer) => {
		world.attach(buffer, 'image/png');
	});
	await driver.sleep(100 + currentParameters.waitTime);
});

Then(
	'So a file with the name {string} is downloaded in this Directory {string}',
	async function checkDownloadedFile(fileName, directory) {
		const world = this;
		try {
			const path = `${downloadDirectory}${fileName}`;
			await fs.promises.access(path, fs.constants.F_OK);
			const timestamp = Date.now();
			// Rename the downloaded file, so a new Run of the Test will not check the old file
			await fs.promises.rename(path, `${downloadDirectory}Seed_Download-${timestamp.toString()}_${fileName}`, (err) => {
				if (err) console.log(`ERROR: ${err}`);
			});
		} catch (e) {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	}
);

Then('So the picture {string} has the name {string}', async function checkPicture(picture, name) {
	const world = this;
	const identifiers = [`//picture[source[contains(@srcset, '${picture}')] or img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]]`, `//img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]`, `${picture}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
	const domain = (await driver.getCurrentUrl()).split('/').slice(0, 3)
		.join('/');
	let finSrc = '';
	await Promise.any(promises)
		.then(async (elem) => {
			if (await elem.getTagName() === 'picture') {
				const childSourceElems = await elem.findElements(By.xpath('.//source'));
				const elementWithSrcset = await childSourceElems.find(async (element) => {
					const srcsetValue = await element.getAttribute('srcset');
					return srcsetValue && srcsetValue.includes(name);
				});
				finSrc = await elementWithSrcset.getAttribute('srcset');
			}
			const primSrc = await elem.getAttribute('src');
			const secSrc = await elem.getAttribute('srcset');
			if (!finSrc && primSrc && primSrc.includes(name)) finSrc = primSrc;
			if (!finSrc && secSrc && secSrc.includes(name)) finSrc = secSrc;
			finSrc = finSrc.split(' ').filter((substring) => substring.includes(name));
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
	await fetch(domain + finSrc, { method: 'HEAD' })
		.then((response) => {
			if (!response.ok) throw Error(`Image ${finSrc} not Found`);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(`Image availability check: could not reach image source ${domain + finSrc} `, e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', async function checkIfTextIsMissing(expectedText) {
	expectedText = applySpecialCommands(expectedText.toString());
	const { resultString, regexFound } = resolveRegex(expectedText);
	const world = this;
	try {
		await driver.wait(async () => driver.executeScript('return document.readyState').then(async (readyState) => readyState === 'complete'));
		await driver.wait(until.elementLocated(By.css('Body')), searchTimeout).then(async (body) => {
			const cssBody = await body.getText().then((bodytext) => bodytext);
			const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
			const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
			const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
			if (regexFound) doesNotMatch(bodyAll, RegExp(resultString), `Page HTML does contain the string/regex: ${resultString}`);
			else expect(bodyAll).to.not.contain(resultString, `Page HTML does contain the string/regex: ${resultString}`);
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(100 + currentParameters.waitTime);
});

// Check if a checkbox is set (true) or not (false)
// eslint-disable-next-line prefer-template
Then('So the checkbox {string} is set to {string} [true OR false]', async function checkBoxIsChecked(checkboxName, checked1) {
	const world = this;
	const identifiers = [`//*[@type='checkbox' and @*='${checkboxName}']`, `//*[contains(text(),'${checkboxName}')]//parent::label`, `//*[contains(text(),'${checkboxName}') or @*='${checkboxName}']`, `${checkboxName}`];
	const checked = (checked1 === 'true');

	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

	await Promise.any(promises)
		.then(async (elem) => {
			expect(await elem.isSelected()).to.equal(checked);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

Then('So on element {string} the css property {string} is {string}', async function cssIs(element, property, value) {
	const world = this;
	const identifiers = [`//*[contains(text(),'${element}')]`, `//*[@id='${element}']`, `//*[@*='${element}']`, `//*[contains(@*, '${element}')]`, `//*[contains(@id, '${element}')]`, `${element}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
	await Promise.any(promises)
		.then(async (elem) => {
			const actual = await elem.getCssValue(property);
			if (actual.startsWith('rgba')) { // in selenium colors are always rgba. support.Color is not implemented in javascript
				const colorNumbers = actual.replace('rgba(', '').replace(')', '')
					.split(',');
				const [r, g, b] = colorNumbers.map((v) => Number(v).toString(16));
				const hex = `#${r}${g}${b}`;
				expect(value.toString()).to.equal(hex.toString(), `actual ${hex} does not match ${value}`);
			} else expect(value.toString()).to.equal(actual.toString(), `actual ${actual} does not match ${value}`);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

Then('So the element {string} has the tool-tip {string}', async function toolTipIs(element, value) {
	const world = this;
	const identifiers = [`//*[contains(text(),'${element}')]`, `//*[@id='${element}']`, `\\*[@*='${element} and @role=tooltip]`, `//*[contains(@*, '${element}')]`, `//*[@*='${element}']`, `//*[contains(@id, '${element}')]`, `${element}`];
	const promises = [];
	for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
	await Promise.any(promises)
		.then(async (elem) => {
			const actual = await elem.getAttribute('title');
			expect(actual).to.equal(value);
		})
		.catch(async (e) => {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`The Element ${element} could not be found (check tool-tip).`);
			throw Error(e);
		});
	await driver.sleep(100 + currentParameters.waitTime);
});

// Closes the webdriver (Browser)
// runs after each Scenario
After(async () => {
	if (currentParameters.oneDriver) {
		scenarioIndex += 1;
		await driver.sleep(1000);
		if (scenarioIndex === testLength) await driver.quit();
	} else {
		scenarioIndex += 1;
		await driver.sleep(1000);
		await driver.quit();
	}
});
