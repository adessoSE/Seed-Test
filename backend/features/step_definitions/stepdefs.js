const {
	Given, When, Then, Before, After, setDefaultTimeout, setWorldConstructor
} = require('@cucumber/cucumber');
const webdriver = require('selenium-webdriver');
const fs = require('file-saver');
const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');
require('geckodriver');
const firefox = require('selenium-webdriver/firefox');
const chrome = require('selenium-webdriver/chrome');


let driver;
const firefoxOptions = new firefox.Options();
const chromeOptions = new chrome.Options();
// if (process.env.NODE_ENV) {
// chromeOptions.addArguments('--headless');
// }
chromeOptions.addArguments('--disable-dev-shm-usage');
// chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--ignore-certificate-errors');
chromeOptions.addArguments('--start-maximized');
chromeOptions.addArguments('--lang=de');
// chromeOptions.addArguments('--start-fullscreen');
chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;
let currentParameters = {};

function CustomWorld({ attach, parameters }) {
	this.attach = attach;
	this.parameters = parameters;
}
let scenarioIndex = 0;

setWorldConstructor(CustomWorld);

// Cucumber default timer for timeout
setDefaultTimeout(30 * 1000);


Before(async function () {
	currentParameters = this.parameters.scenarios[scenarioIndex]
	if (currentParameters.oneDriver) {
		if (currentParameters.oneDriver === true) {
			if (driver) {
				console.log("Es gibt bereits einen Treiber")
			} else {
				driver = new webdriver.Builder()
					.forBrowser(currentParameters.browser)
					.setChromeOptions(chromeOptions)
					.build();
			}
		}
	} else {

		driver = new webdriver.Builder()
			.forBrowser(currentParameters.browser)
			.setChromeOptions(chromeOptions)
			.build();
	}

});


// driver = new webdriver.Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();



// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
	await driver.sleep(currentParameters.waitTime);
});

Given('I am on the website: {string}', async function getUrl(url) {
	const world = this;
	try {
		await driver.get(url);
		await driver.getCurrentUrl().then(async (currentUrl) => {
			// expect(currentUrl).to.equal(url, 'Error');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
});

Given('I add a cookie with the name {string} and value {string}', async function (name, value) {
	const world = this;
	try {
		await driver.manage().addCookie({ name, value });
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
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
	await driver.sleep(currentParameters.waitTime);
});

Given('I take a screenshot', async function() {
	const world = this;
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
	await driver.sleep(currentParameters.waitTime);
});


// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async function getUrl(url) {
	const world = this;
	try {
		await driver.get(url);
		await driver.getCurrentUrl().then(async (currentUrl) => {
			// expect(currentUrl).to.equal(url, 'Error');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function clickButton(button) {
	const world = this;
	await driver.getCurrentUrl()
		.then(async (currentUrl) => {
			// for daisy only: don't throw an error and end the testcase if "Alte Sitzung Beenden" is not found
			if (button === 'Alte Sitzung beenden') {
				try {
					await driver.wait(until.elementLocated(By.xpath(`//*[@name='kill-session']`)), 3 * 1000).click();
				} catch (e) {
					console.log('Button "Alte Sitzung Beenden" not found. Skipping the Step...');
				}
				return;
			}
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
			else try {	// first check for the exact id
				await driver.wait(until.elementLocated(By.xpath(`//*[@id='${button}']`)), 3 * 1000).click();
			} catch (e) {
				try {	// check for an id with the substring using contains
					await driver.wait(until.elementLocated(By.xpath(`//*[contains(@id,'${button}')]`)), 3 * 1000).click();
				} catch (e2) {
					try { // text() looks for a text node (inside an element like button
						await driver.wait(until.elementLocated(By.xpath(`//*[text()='${button}' or @*='${button}']`)), 3 * 1000).click();
					} catch (e3) {
						try { // check for any element containing the string
							await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${button}')]`)), 3 * 1000).click();
						} catch (e4) {
							try {
								await driver.findElement(By.xpath(`${button}`)).click();
							} catch (ed) {
								await driver.takeScreenshot().then(async (buffer) => {
									world.attach(buffer, 'image/png');
								});
								throw Error(e);
							}
						}
					}
				}
			}
		});
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async readyState => readyState === 'complete'));
	await driver.sleep(currentParameters.waitTime);
});


// selenium sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', async function (ms) {
	const world = this;
	try {
		await driver.sleep(parseInt(ms,10));
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
	try {
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).clear();
		await driver.findElement(By.xpath(`//input[@id='${label}']`)).sendKeys(value);
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//input[contains(@id,'${label}')]`)).clear();
			await driver.findElement(By.xpath(`//input[contains(@id,'${label}')]`)).sendKeys(value);
		} catch (e2) {
			try {
				await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).clear();
				await driver.findElement(By.xpath(`//textarea[@id='${label}']`)).sendKeys(value);
			} catch (e3) {
				try {
					await driver.findElement(By.xpath(`//textarea[contains(@id,'${label}')]`)).clear();
					await driver.findElement(By.xpath(`//textarea[contains(@id,'${label}')]`)).sendKeys(value);
				} catch (e4) {
					try {
						await driver.findElement(By.xpath(`//*[@id='${label}']`)).clear();
						await driver.findElement(By.xpath(`//*[@id='${label}']`)).sendKeys(value);
					} catch (e5) {
						try {
							await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).clear();
							await driver.findElement(By.xpath(`//input[@type='text' and @*='${label}']`)).sendKeys(value);
						} catch (e6) {
							try {
								await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).clear();
								await driver.findElement(By.xpath(`//label[contains(text(),'${label}')]/following::input[@type='text']`)).sendKeys(value);
							} catch (e7) {
								try {
									await driver.findElement(By.xpath(`${label}`)).clear();
									await driver.findElement(By.xpath(`${label}`)).sendKeys(value);
								} catch (e8) {
									await driver.takeScreenshot().then(async (buffer) => {
										world.attach(buffer, 'image/png');
									});
									throw Error(e);
								}
							}
						}
					}
				}
			}
		}
	}
	await driver.sleep(currentParameters.waitTime);
});

// "Radio"
When('I select {string} from the selection {string}', async function clickRadioButton(radioname, label) {
	const world = this;
	try {
		await driver.wait(until.elementLocated(By.xpath(`//*[@${label}='${radioname}']`)), 3 * 1000).click();
	} catch (e) {
		try {
			await driver.wait(until.elementLocated(By.xpath(`//*[contains(@${label}, '${radioname}')]`)), 3 * 1000)
				.click();
		} catch (e8) {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
	}
	await driver.sleep(currentParameters.waitTime);
});


// Select an Option from a dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function selectFromDropdown(value, dropd) {
	let world;
	try {
		await driver.wait(until.elementLocated(By.xpath(`//*[@*='${dropd}']/option[text()='${value}']`)), 3 * 1000).click();
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::button[text()='${value}']`)).click();
		} catch (e2) {
			try {
				await driver.findElement(By.xpath(`//label[contains(text(),'${dropd}')]/following::span[text()='${value}']`)).click();
			} catch (e3) {
				try {
					await driver.findElement(By.xpath(`//*[contains(text(),'${dropd}')]/following::*[contains(text(),'${value}']`)).click();
				} catch (e4) {
					try {
						await driver.findElement(By.xpath(`${dropd}`)).click();
					} catch (e5) {
						world = this;
						await driver.takeScreenshot()
							.then(async (buffer) => {
								world.attach(buffer, 'image/png');
							});
						throw Error(e);
					}
				}
			}
		}
	}
	await driver.sleep(currentParameters.waitTime);
});

// Dropdown via XPath:
When('I select the option {string}', async function selectviaXPath(dropd) {
	const world = this;
	try {
		await driver.findElement(By.xpath(`${dropd}`)).click();
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
});

// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function hoverClick(element, option) {
	const world = this;
	try {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`${element}`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		const action2 = driver.actions({ bridge: true }); // second action needed?
		const selection = await driver.findElement(By.xpath(`${option}`));
		await action2.move({ origin: selection }).click()
			.perform();
	} catch (e) {
		const action = driver.actions({ bridge: true });
		const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), 3 * 1000);
		await action.move({ x: 0, y: 0, origin: link }).perform();
		await driver.sleep(2000);
		try {
			const action2 = driver.actions({ bridge: true }); // second action needed?
			const selection = await driver.findElement(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`));
			await action2.move({ origin: selection }).click()
				.perform();
		} catch (e2) {
			try {
				const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), 3 * 1000);
				await action2.move({ origin: selection }).click()
					.perform();
			} catch (e3) {
				await driver.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				throw Error(e);
			}
		}
	}
	await driver.sleep(currentParameters.waitTime);
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', async () => {});

// Check the Checkbox with a specific name or id
When('I check the box {string}', async function checkBox(name) {
	// Some alternative methods to "check the box":
	// await driver.executeScript("arguments[0].submit;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.executeScript("arguments[0].click;", driver.findElement(By.xpath("//input[@type='checkbox' and @id='" + name + "']")));
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).submit();
	// await driver.wait(until.elementLocated(By.xpath('//*[@type="checkbox" and @*="'+ name +'"]'))).click();
	const world = this;
	try { // this one works, even if the element is not clickable (due to other elements blocking it):
		await driver.findElement(By.xpath(`//*[@type="checkbox" and @*="${name}"]`)).sendKeys(Key.SPACE);
	} catch (e) {
		try { // this one works, for a text label next to the actual checkbox
			await driver.findElement(By.xpath(`//*[contains(text(),'${name}')]//parent::label`)).click();
		} catch (e2) { // default
			try {
				await driver.findElement(By.xpath(`//*[contains(text(),'${name}') or @*='${name}']`)).click();
			} catch (e3) {
				try {
					await driver.findElement(By.xpath(`${name}`)).click();
				} catch (e4) {
					await driver.takeScreenshot().then(async (buffer) => {
						world.attach(buffer, 'image/png');
					});
					throw Error(e);
				}
			}
		}
	}
	await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
	await driver.sleep(currentParameters.waitTime);
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
	await driver.sleep(currentParameters.waitTime);
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
	await driver.sleep(currentParameters.waitTime);
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
	await driver.sleep(currentParameters.waitTime);
});

When('I want to upload the file from this path: {string} into this uploadfield: {string}',
	async function uploadFile(path, input) {
		const world = this;
		try {
			await driver.wait(until.elementLocated(By.xpath(`//input[@*='${input}']`)), 3 * 1000)
				.sendKeys(`${path}`);
		} catch (e) {
			try {
				await driver.wait(until.elementLocated(By.xpath(`${input}`)), 3 * 1000)
					.sendKeys(`${path}`);
			} catch (e2) {
				await driver.takeScreenshot().then(async (buffer) => {
					world.attach(buffer, 'image/png');
				});
				throw Error(e);
			}
		}
		await driver.sleep(currentParameters.waitTime);
});

// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', async function (url) {
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
	await driver.sleep(currentParameters.waitTime);
});

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async function checkForTextInField(expectedText, label) {
	const world = this;
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async readyState => readyState === 'complete'));
	try {
		await driver.findElement(By.xpath(`//*[@id='${label}']`))
			.then(async (body) => {
				const resp = await body.getText().then(text => text);
				expect(expectedText).to.equal(resp, 'Textfield does not match the string');
			});
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//*[@*='${label}']`))
				.then(async (body) => {
					const resp = await body.getText().then(text => text);
					expect(expectedText).to.equal(resp, 'Textfield does not match the string');
				});
		} catch (e2) {
			try {
				await driver.findElement(By.xpath(`//*[contains(@*, '${label}')]`))
					.then(async (body) => {
						const resp = await body.getText().then(text => text);
						expect(expectedText).to.equal(resp, 'Textfield does not contain the string');
					});
			} catch (e3) {
				try {
					await driver.findElement(By.xpath(`${label}`))
						.then(async (body) => {
							const resp = await body.getText().then(text => text);
							expect(expectedText).to.equal(resp, 'Textfield does not contain the string');
						});
				} catch (e4) {
					await driver.takeScreenshot()
						.then(async (buffer) => {
							world.attach(buffer, 'image/png');
						});
					throw Error(e);
				}
			}
		}
	}
	await driver.sleep(currentParameters.waitTime);
});

// Search if a is text in html code
Then('So I can see the text: {string}', async function (string) {
	const world = this;
	try {
		await driver.sleep(500);
		await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
		await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
			const cssBody = await body.getText().then(bodytext => bodytext);
			const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
			const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
			const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
			expect(bodyAll.toLowerCase()).to.include(string.toString().toLowerCase(), 'Error');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
});

// Search a textfield in the html code and assert if it's empty
Then('So I can\'t see text in the textbox: {string}', async function (label) {
	const world = this;
	await driver.sleep(500);
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async readyState => readyState === 'complete'));
	try {
		await driver.findElement(By.xpath(`//*[@id='${label}']`))
			.then(async (body) => {
				const resp = await body.getText().then(text => text);
				expect(resp).to.equal('', 'Textfield does contain some Text');
			});
	} catch (e) {
		try {
			await driver.findElement(By.xpath(`//*[@*='${label}']`))
				.then(async (body) => {
					const resp = await body.getText()
						.then(text => text);
					expect(resp).to.equal('', 'Textfield does contain some Text');
				});
		} catch (e2) {
			try {
				await driver.findElement(By.xpath(`//*[contains(@id, '${label}')]`))
					.then(async (body) => {
						const resp = await body.getText()
							.then(text => text);
						expect(resp).to.equal('', 'Textfield does contain some Text');
					});
			} catch (e3) {
				try {
					await driver.findElement(By.xpath(`${label}`))
						.then(async (body) => {
							const resp = await body.getText().then(text => text);
							expect(resp).to.equal('', 'Textfield does contain some Text');
						});
				} catch (e4) {
					await driver.takeScreenshot().then(async (buffer) => {
						world.attach(buffer, 'image/png');
					});
				}
				throw Error(e);
			}
		}
	}
	await driver.takeScreenshot().then(async (buffer) => {
		world.attach(buffer, 'image/png');
	});
	await driver.sleep(currentParameters.waitTime);
});


Then('So a file with the name {string} is downloaded in this Directory {string}',
	async function checkDownloadedFile(fileName, directory) {
		const world = this;
		try {
			const path = `${directory}\\${fileName}`; // Todo: pathingtool (path.normalize)serverhelper
			await fs.promises.access(path, fs.constants.F_OK);
		} catch (e) {
			await driver.takeScreenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		}
		await driver.sleep(currentParameters.waitTime);
	});

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', async function checkIfTextIsMissing(text) {
	const world = this;
	try {
		await driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
		await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
			const cssBody = await body.getText().then(bodytext => bodytext);
			const innerHtmlBody = await driver.executeScript('return document.documentElement.innerHTML');
			const outerHtmlBody = await driver.executeScript('return document.documentElement.outerHTML');
			const bodyAll = cssBody + innerHtmlBody + outerHtmlBody;
			expect(bodyAll.toLowerCase()).to.not.include(text.toString().toLowerCase(), 'Error');
		});
	} catch (e) {
		await driver.takeScreenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
	await driver.sleep(currentParameters.waitTime);
});

async function daisyLogout() {
	await driver.sleep(200);
	try {
		await driver.getCurrentUrl().then(async (currentUrl) => {
			const url = currentUrl.split('.de')[0];
			driver.get(url + '/redirect_uri?logout=/');
		});
	} catch (e) {
		try {
			await clickButton('Abmelden');
			await driver.sleep(200);
		} catch (e2) {
			try {
				await clickButton('Zurück zum Portal');
				await driver.sleep(200);
				await clickButton('Abmelden');
				await driver.sleep(200);
			} catch (e3) {
				await clickButton('Abbrechen');
				await driver.sleep(200);
				await clickButton('Zurück zum Portal');
				await driver.sleep(200);
				await clickButton('Abmelden');
				await driver.sleep(200);
			}
		}
	}
}

// Closes the webdriver (Browser)
// runs after each Scenario
After(async () => {
	// console.log(currentParameters.daisyAutoLogout);
	// console.log(typeof (currentParameters.daisyAutoLogout));
	// currentParameters.daisyAutoLogout == 'true' ||
	if (currentParameters && currentParameters.daisyAutoLogout === true) {
		console.log('Trying DaisyAutoLogout');
		try {
			await daisyLogout();
			await driver.sleep(500);
			await driver.quit();
		} catch (e) {
			console.log('Failed DaisyAutoLogout');
			await driver.sleep(500);
			await driver.quit();
		}
	}
	scenarioIndex += 1;
	// Without Timeout driver quit is happening too quickly. Need a better solution
	// https://github.com/SeleniumHQ/selenium/issues/5560
	const condition = until.elementLocated(By.name('loader'));
	driver.wait(async drive => condition.fn(drive), 1000, 'Loading failed.');
	// driver.quit();
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, waits for next page to be loaded
async function clickButton(button) {
	await driver.getCurrentUrl()
		.then(async (currentUrl) => {
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
			else try {	// first check for the exact id
				await driver.findElement(By.xpath(`//*[@id='${button}']`)).click();
			} catch (e) {
				try {	// check for an id with the substring using contains
					await driver.findElement(By.xpath(`//*[contains(@id,'${button}')]`)).click();
				} catch (e2) {
					try { // text() looks for a text node (inside an element like button
						await driver.findElement(By.xpath(`//*[text()='${button}' or @*='${button}']`)).click();
					} catch (e3) {
						try { // check for any element containing the string
							await driver.findElement(By.xpath(`//*[contains(text(),'${button}')]`)).click();
						} catch (e4) {
							await driver.findElement(By.xpath(`${button}`)).click();
						}
					}
				}
			}
		});
	await driver.wait(async () => driver.executeScript('return document.readyState')
		.then(async readyState => readyState === 'complete'));
}

// selenium sleeps for a certain amount of time
async function waitMs(ms) {
	await driver.sleep(parseInt(ms, 10));
}
