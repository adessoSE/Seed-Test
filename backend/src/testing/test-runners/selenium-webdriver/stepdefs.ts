import {
	Given, When, Then, Before, After, setWorldConstructor, setDefaultTimeout, ITestCaseHookParameter
} from '@cucumber/cucumber';
import fs from 'fs';
import assert from 'assert';
import { By, until, Key } from 'selenium-webdriver';
import { SeleniumWebdriverWorld } from './seleniumWebdriverWorld';
import { applySpecialCommands } from '../../../helpers/specialCommandParser';

// Welt-Konstruktor setzen
setWorldConstructor(SeleniumWebdriverWorld);
setDefaultTimeout(60000);

// Variables for scenario management within SeleniumWebdriverWorld
let scenarioCount = 0;
let totalScenarios = 0;

// Global variables - CAUTION: This is problematic for parallel execution!
// These should ideally be part of the World instance 'this'
let driver: any;
let searchTimeout: number;
let downloadDirectory: string;
let tmpUploadDir: string;
let currentParameters: any;

// --- Error Handling ---

const NotFoundError = (e: string) => Error(`ElementNotFoundError: ${e}`);

class CustomError extends Error {
	constructor(message: string) {
		super();
		const cutOff = message.indexOf(': expected');
		this.message = cutOff === -1 ? message : message.substring(0, cutOff);
		this.stack = '';
	}
}

function betterError(error: Error): CustomError {
	const myError = new CustomError(error.message);
	myError.stack = `${myError.message}\n${error.stack}`;
	return myError;
}

async function handleError(f: () => Promise<any>): Promise<void> {
	try {
		await f();
	} catch (error: any) {
		throw betterError(error);
	}
}

// Hooks
Before(async function (this: SeleniumWebdriverWorld) {
	// Browser start
	if (scenarioCount === 0) {
		totalScenarios = this.parameters.scenarios.length;
		console.log(`Total scenarios to run: ${totalScenarios}`);
	}

	// Transfer scenario index to World
	console.log('Scenario count is: ', scenarioCount);
	await this.setScenarioCount(scenarioCount);
	console.log(`Starting Scenario with Index: ${scenarioCount + 1}`);
	//await this.launchBrowser(this.parameters.scenarios[scenarioCount]);
	await this.launchBrowser();

	// Set global variables from the World instance
	driver = this.getDriver();
	searchTimeout = this.searchTimeout;
	downloadDirectory = this.downloadDir;
	tmpUploadDir = this.tmpUploadDir;
	currentParameters = this.testParameters;

	// Wait for DOM readiness
	await driver.manage().setTimeouts({
		implicit: 10000,
		pageLoad: 30000,
		script: 10000
	});
});

After(async function (this: SeleniumWebdriverWorld, scenario: ITestCaseHookParameter) {
	// Screenshot bei Fehlern
	if (scenario.result?.status === 'FAILED') try {
		const screenshot = await this.takeScreenshot();
		this.attach(screenshot, 'image/png');
	} catch (e: any) {
		console.error('Failed to take screenshot:', e);
	}
	console.log(`Finished Scenario ${scenarioCount + 1}/${totalScenarios}`);

	// Browser immer schließen, unabhängig vom Ergebnis
	if (
		!this.parameters.scenarios[scenarioCount].oneDriver
		|| scenarioCount === totalScenarios - 1
	) try { 
		await this.closeBrowser();
	} catch (e: any) {
		console.error('Failed to close browser:', e);
		// Notfall-Schließung
		if (driver) try {
			await driver.quit();
		} catch (e2) {
			console.error('Emergency browser close failed:', e2);
		}
	}

	// Counter erhöhen oder zurücksetzen
	if (scenarioCount === totalScenarios - 1) {
		scenarioCount = 0;
		totalScenarios = 0;
		console.log(
			'We are resetting the scenario count!',
			scenarioCount,
			totalScenarios
		);
		delete process.env.CUCUMBER_TOTAL_WORKERS;
		delete process.env.CUCUMBER_WORKER_ID;
	} else scenarioCount++;
});

// / #################### GIVEN ########################################
Given('As a {string}', async function (userRole: string) {
	this.role = userRole;
	// await driver.sleep(100 + currentParameters.waitTime);
});

Given('I am on the website: {string}', async function getUrl(this: SeleniumWebdriverWorld, url: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.get(url);
			await driver.getCurrentUrl();
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Given('I add a cookie with the name {string} and value {string}', async function addCookie(this: SeleniumWebdriverWorld, name: string, value: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.manage().addCookie({ name, value });
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Given('I remove a cookie with the name {string}', async function removeCookie(this: SeleniumWebdriverWorld, name: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.manage().deleteCookie(name);
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Given('I add a session-storage with the name {string} and value {string}', async function addSessionStorage(this: SeleniumWebdriverWorld, name: string, value: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.executeScript(`window.sessionStorage.setItem('${name}', '${value}');`);
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Given('I remove a session-storage with the name {string}', async function addSessionStorage(this: SeleniumWebdriverWorld, name: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.executeScript(`window.sessionStorage.removeItem('${name}');`);
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Take a Screenshot
Given('I take a screenshot', async function (this: SeleniumWebdriverWorld) {
	await handleError(async () => {
		const world = this;
		await driver.wait(async () => driver.executeScript('return document.readyState')
			.then(async (readyState: string) => readyState === 'complete'));
		try {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Take a Screenshot and optionally scroll to a specific element
Given('I take a screenshot. Optionally: Focus the page on the element {string}', async function takeScreenshot(this: SeleniumWebdriverWorld, element: string) {
	await handleError(async () => {
		const world = this;
		await driver.wait(async () => driver.executeScript('return document.readyState')
			.then(async (readyState: string) => readyState === 'complete'));
		const identifiers = [`//*[@id='${element}']`, `//*[@*='${element}']`, `//*[contains(@id, '${element}')]`, `${element}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.executeScript('arguments[0].scrollIntoView(true);', driver.findElement(By.xpath(idString))));

		await Promise.any(promises)
			.then(async () => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Element ${element} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async function getUrl(this: SeleniumWebdriverWorld, url: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.get(url);
			await driver.getCurrentUrl();
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function clickButton(this: SeleniumWebdriverWorld, button: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//*[@id='${button}']`, `//*[contains(@id,'${button}')]`, `//*[text()='${button}' or @*='${button}']`, `//*[contains(text(),'${button}')]`, `${button}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

		await Promise.any(promises)
			.then((elem) => elem.click())
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Button ${button} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', async function (this: SeleniumWebdriverWorld, ms: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.sleep(parseInt(ms, 10));
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
	});
});

// Search a field in the html code and fill in the value
When('I insert {string} into the field {string}', async function fillTextField(this: SeleniumWebdriverWorld, text: string, label: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//input[@id='${label}']`, `//input[contains(@id,'${label}')]`, `//textarea[@id='${label}']`, `//textarea[contains(@id,'${label}')]`,
			`//textarea[@*='${label}']`, `//textarea[contains(@*='${label}')]`, `//*[@id='${label}']`, `//input[@type='text' and @*='${label}']`,
			`//label[contains(text(),'${label}')]/following::input[@type='text']`, `${label}`];

		const value = applySpecialCommands(text);

		const promises = [];
		for (const idString of identifiers) promises.push(
			driver.wait(until.elementLocated((By.xpath(idString))), searchTimeout, 100)
		);

		await Promise.any(promises)
			.then(async (elem) => {
				await elem.clear();
				await typing(elem, value);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Input/Textarea ${label} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

const typing = async (elem: any, inputString: string) => {
	for (const char of inputString.split('')) await elem.sendKeys(char);
};

// "Radio"
When('I select {string} from the selection {string}', async function clickRadioButton(this: SeleniumWebdriverWorld, radioname: string, label: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//input[@${label}='${radioname}']/following-sibling::label[1]`, `//input[contains(@${label}, '${radioname}')]/following-sibling::label[1]`, `//label[contains(text(), '${label}')]/following::input[@value='${radioname}']/following-sibling::label[1]
	`, `//input[@name='${label}' and @value='${radioname}']/following-sibling::label[1]`, `//input[contains(@*,'${label}')]/following-sibling::label[contains(text(), '${radioname}')]`, `${radioname}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

		await Promise.any(promises)
			.then((elem) => elem.click())
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Radio ${label} with option ${radioname} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Select an Option from a dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function (this: SeleniumWebdriverWorld, value: string, dropd: string) {
	await handleError(async () => {
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
			.catch(async () => {
				const ariaProm = [driver.findElement(By.xpath(`//*[contains(text(),"${dropd}") or contains(@id, "${dropd}") or contains(@*, "${dropd}")]`)), driver.findElement(By.xpath(`${dropd}`))];
				const dropdownElement = await Promise.any(ariaProm);
				await dropdownElement.click();

				const ariaOptProm = [driver.findElement(By.xpath(`(//*[contains(text(),'${value}') or contains(@id, '${value}') or contains(@*, '${value}')]/option) | (//*[@role='listbox']//*[ancestor::*[@role='option']//*[contains(text(),'${value}')]])
			`)), driver.findElement(By.xpath(`${value}`))];
				const dropdownOption = await Promise.any(ariaOptProm).catch((e: any) => { throw e; });

				// Wait for the dropdown options to be visible
				await driver.wait(until.elementIsVisible(dropdownOption)).catch((e: any) => { throw e; });

				// Select the option from the dropdown
				await dropdownOption.click();
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Dropdown ${dropd} with option ${value} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(currentParameters.waitTime);
	});
});

// Dropdown via XPath:
When('I select the option {string}', async function selectviaXPath(this: SeleniumWebdriverWorld, dropd: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.wait(until.elementLocated(By.xpath(`${dropd}`)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100).click();
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			if (Object.keys(e).length === 0) throw NotFoundError(`Dropdown-option ${dropd} could not be found!`);
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function hoverClick(this: SeleniumWebdriverWorld, element: string, option: string) {
	await handleError(async () => {
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
		} catch (e: any) {
			const action = driver.actions({ bridge: true });
			const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), maxWait, waitText, waitRetryTime);
			await action.move({ x: 0, y: 0, origin: link }).perform();
			await driver.sleep(500);
			const action2 = driver.actions({ bridge: true });
			try {
				const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`)), maxWait, waitText, waitRetryTime);
				await action2.move({ origin: selection }).click()
					.perform();
			} catch (_e2) {
				try {
					const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), maxWait, waitText, waitRetryTime);
					await action2.move({ origin: selection }).click()
						.perform();
				} catch (_e3) {
					await world.takeScreenshot().then(async (buffer) => {
						world.attach(buffer, 'image/png');
					});
					if (Object.keys(e).length === 0) throw NotFoundError(`Selector ${element} could not be found!`);
					throw Error(e);
				}
			}
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', async () => { });

// Check the Checkbox with a specific name or id
When('I check the box {string}', async function checkBox(this: SeleniumWebdriverWorld, name: string) {
	// Some alternative methods to "check the box":
	// await driver.executeScript("arguments[0].submit;",
	// driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.executeScript("arguments[0].click;",
	// driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.wait(until.elementLocated(
	// By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).submit();
	// await driver.wait(until.elementLocated(
	// By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).click();
	await handleError(async () => {
		const world = this;
		// const identifiers = [`//*[@type="checkbox" and @*="${name}"]`, `//*[contains(text(),
		// '${name}')]//parent::label`, `//*[contains(text(),'${name}') or @*='${name}']`, `${name}`]
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
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Checkbox ${name} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

When('Switch to the newly opened tab', async function switchToNewTab(this: SeleniumWebdriverWorld) {
	await handleError(async () => {
		const world = this;
		try {
			const tabs = await driver.getAllWindowHandles();
			await driver.switchTo().window(tabs[1]);
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

When('Switch to the tab number {string}', async function switchToSpecificTab(this: SeleniumWebdriverWorld, numberOfTabs: string) {
	await handleError(async () => {
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
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// TODO: delete this following step (also in DB), once every branch has the changes
When('I switch to the next tab', async function switchToNewTab(this: SeleniumWebdriverWorld) {
	await handleError(async () => {
		const world = this;
		try {
			const tabs = await driver.getAllWindowHandles();
			await driver.switchTo().window(tabs[1]);
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

When(
	'I want to upload the file from this path: {string} into this uploadfield: {string}',
	async function uploadFile(this: SeleniumWebdriverWorld, file: string, input: string) {
		const world = this;
		const identifiers = [`//input[@*='${input}']`, `${input}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
		const path = tmpUploadDir + file;
		await Promise.any(promises)
			.then((elem) => elem.sendKeys(`${path}`))
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
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
Then('So I will be navigated to the website: {string}', async function checkUrl(this: SeleniumWebdriverWorld, url: string) {
	await handleError(async () => {
		const world = this;
		try {
			await driver.getCurrentUrl().then(async (currentUrl: string) => {
				assert.strictEqual(currentUrl.replace(/\/$/g, ''), url.replace(/[\s]|\/\s*$/g, ''), 'ERROR expected: ...');
			});
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

const resolveRegex = (rawString?: string): { resultString: string, regexFound: boolean } => {
	const string = !rawString ? '' : rawString;
	const regex = /(\{Regex:)(.*)(\})(.*)/g;
	const regexFound = regex.test(string);
	const resultString = regexFound ? string.replace(regex, '$2$4') : string;
	return { resultString, regexFound };
};

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async function checkForTextInField(this: SeleniumWebdriverWorld, expectedText: string, label: string) {
	await handleError(async () => {
		const text = applySpecialCommands(expectedText.toString().trim());
		const { resultString, regexFound } = resolveRegex(text);

		const world = this;

		const identifiers = [`//*[@id='${label}']`, `//*[@*='${label}']`, `//*[contains(@*, '${label}')]`, `//label[contains(text(),'${label}')]/following::input[@type='text']`, `${label}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

		await Promise.any(promises)
			.then(async (elem) => {
				let resp = await elem.getText();
				resp = resp === '' ? await elem.getAttribute('value') : resp;
				resp = resp === '' ? await elem.getAttribute('outerHTML') : resp;
				if (regexFound) assert.match(resp, RegExp(resultString), `The Textfield ${label} does not contain the string/regex: '${resultString}' , actual: '${resp}'!`);
				else assert.strictEqual(resp, resultString, `The Textfield ${label} does not contain the string: '${resultString}' , actual: '${resp}'!`);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`Textarea ${label} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Search if a is text in html code
Then('So I can see the text: {string}', async function textPresent(this: SeleniumWebdriverWorld, text: string) {
	await handleError(async () => {
		const expectedText = applySpecialCommands(text.toString().trim());
		const { resultString, regexFound } = resolveRegex(expectedText);
		const world = this;
		try {
			await driver.wait(async () => driver.executeScript('return document.readyState').then(async (readyState: string) => readyState === 'complete'));
			await driver.wait(until.elementLocated(By.css('Body')), searchTimeout)
				.then(async (body: any) => {
					const cssBody = await body.getText().then((bodytext: string) => bodytext);
					const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
					const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
					const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
					if (regexFound) assert.match(bodyAll, RegExp(resultString), `The Page HTML does not contain the string/regex: '${resultString}'`);
					else assert(bodyAll.includes(resultString), `The Page HTML does not contain the string: '${resultString}'`);
				});
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Search a textfield in the html code and assert if it's empty
Then('So I can\'t see text in the textbox: {string}', async function textAbsent(this: SeleniumWebdriverWorld, label: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//*[@id='${label}']`, `//*[@*='${label}']`, `//*[contains(@id, '${label}')]`, `${label}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

		await Promise.any(promises)
			.then(async (elem) => {
				const resp = await elem.getText().then((text: string) => text);
				assert.strictEqual(resp, '', 'Textfield does contain some Text');
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Textarea ${label} could not be found!`);
				throw Error(e);
			});
		await world.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Then(
	'So a file with the name {string} is downloaded in this Directory {string}',
	async function checkDownloadedFile(this: SeleniumWebdriverWorld, fileName: string, _directory: string) {
		await handleError(async () => {
			const world = this;
			try {
				const path = `${downloadDirectory}${fileName}`;
				await fs.promises.access(path, fs.constants.F_OK);
				const timestamp = Date.now();
				// Rename the downloaded file, so a new Run of the Test will not check the old file
				await fs.promises.rename(path, `${downloadDirectory}Seed_Download-${timestamp.toString()}_${fileName}`);
			} catch (e: any) {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				throw Error(e);
			}
			await driver.sleep(100 + currentParameters.waitTime);
		});
	}
);

Then('So the picture {string} has the name {string}', async function checkPicture(this: SeleniumWebdriverWorld, picture: string, name: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//picture[source[contains(@srcset, '${picture}')] or img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]]`, `//img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]`, `${picture}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
		const domain = (await driver.getCurrentUrl()).split('/').slice(0, 3)
			.join('/');
		let finSrc: any = '';
		await Promise.any(promises)
			.then(async (elem) => {
				if (await elem.getTagName() === 'picture') {
					const childSourceElems = await elem.findElements(By.xpath('.//source'));
					const elementWithSrcset = await childSourceElems.find(async (element: any) => {
						const srcsetValue = await element.getAttribute('srcset');
						return srcsetValue && srcsetValue.includes(name);
					});
					if (elementWithSrcset) 
						finSrc = await elementWithSrcset.getAttribute('srcset');
                    
				}
				const primSrc = await elem.getAttribute('src');
				const secSrc = await elem.getAttribute('srcset');
				if (!finSrc && primSrc && primSrc.includes(name)) finSrc = primSrc;
				if (!finSrc && secSrc && secSrc.includes(name)) finSrc = secSrc;
				finSrc = finSrc.split(' ').filter((substring: string) => substring.includes(name));
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Picture ${picture} could not be found!`);
				throw Error(e);
			});
			
		// Ensure finSrc is not an empty array before fetch
		const srcToFetch = Array.isArray(finSrc) ? finSrc[0] : finSrc; 
		if (!srcToFetch) 
			throw new Error(`Image source for "${name}" could not be determined.`);
        
		await fetch(domain + finSrc, { method: 'HEAD' })
			.then((response) => {
				if (!response.ok) throw Error(`Image ${finSrc} not Found`);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Picture ${picture} could not be found!`);
				throw Error(`Image availability check: could not reach image source ${domain + finSrc} `, e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', async function checkIfTextIsMissing(this: SeleniumWebdriverWorld, text: string) {
	await handleError(async () => {
		const expectedText = applySpecialCommands(text.trim());
		const { resultString, regexFound } = resolveRegex(expectedText);
		const world = this;
		try {
			await driver.wait(async () => driver.executeScript('return document.readyState').then(async (readyState: string) => readyState === 'complete'));
			await driver.wait(until.elementLocated(By.css('Body')), searchTimeout).then(async (body: any) => {
				const cssBody = await body.getText().then((bodytext: string) => bodytext);
				const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
				const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
				const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
				if (regexFound) assert.doesNotMatch(bodyAll, RegExp(resultString), `The Page HTML does contain the regex/string: '${resultString}'.\n`);
				else assert(!bodyAll.includes(resultString), `The Page HTML does contain the string: '${resultString}'.\n`);
			});
		} catch (e: any) {
			await world.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

// Check if a checkbox is set (true) or not (false)
 
Then('So the checkbox {string} is set to {string} [true OR false]', async function checkBoxIsChecked(this: SeleniumWebdriverWorld, checkboxName: string, checked1: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//*[@type='checkbox' and @*='${checkboxName}']`, `//*[contains(text(),'${checkboxName}')]//parent::label`, `//*[contains(text(),'${checkboxName}') or @*='${checkboxName}']`, `${checkboxName}`];
		const checked = (checked1 === 'true');

		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));

		await Promise.any(promises)
			.then(async (elem) => {
				assert.strictEqual(await elem.isSelected(), checked);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The checkbox ${checkboxName} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Then('So on element {string} the css property {string} is {string}', async function cssIs(this: SeleniumWebdriverWorld, element: string, property: string, value: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//*[contains(text(),'${element}')]`, `//*[@id='${element}']`, `//*[@*='${element}']`, `//*[contains(@*, '${element}')]`, `//*[contains(@id, '${element}')]`, `${element}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
		await Promise.any(promises)
			.then(async (elem) => {
				const actual = await elem.getCssValue(property);
				// in selenium colors are always rgba. support.Color is not implemented in javascript
				if (actual.startsWith('rgba')) {
					const colorNumbers = actual.replace('rgba(', '').replace(')', '')
						.split(',');
					const [r, g, b] = colorNumbers.map((v: string) => Number(v).toString(16));
					const hex = `#${r}${g}${b}`;
					assert.strictEqual(value.toString(), hex.toString(), `The css property ${property} of element ${element} does not match '${value}', actual '${hex}'`);
				} else assert.strictEqual(value.toString(), actual.toString(), `The css property ${property} of element ${element} does not match '${value}', actual '${actual}'`);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Element ${element} could not be found!`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});

Then('So the element {string} has the tool-tip {string}', async function toolTipIs(this: SeleniumWebdriverWorld, element: string, value: string) {
	await handleError(async () => {
		const world = this;
		const identifiers = [`//*[contains(text(),'${element}')]`, `//*[@id='${element}']`, `\\*[@*='${element} and @role=tooltip]`, `//*[contains(@*, '${element}')]`, `//*[@*='${element}']`, `//*[contains(@id, '${element}')]`, `${element}`];
		const promises = [];
		for (const idString of identifiers) promises.push(driver.wait(until.elementLocated(By.xpath(idString)), searchTimeout, `Timed out after ${searchTimeout} ms`, 100));
		await Promise.any(promises)
			.then(async (elem) => {
				const actual = await elem.getAttribute('title');
				assert.strictEqual(actual, value);
			})
			.catch(async (e: any) => {
				await world.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				if (Object.keys(e).length === 0) throw NotFoundError(`The Element ${element} could not be found (check tool-tip).`);
				throw Error(e);
			});
		await driver.sleep(100 + currentParameters.waitTime);
	});
});
