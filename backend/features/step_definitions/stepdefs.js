/* eslint-disable func-names */
console.log('Laoding stepdefs...');
const { expect } = require('@playwright/test');
const path = require('path');
const {
	Given, When, Then, setWorldConstructor, defineParameterType, Before, After,
	Status,
    setDefaultTimeout
} = require('@cucumber/cucumber');
const fs = require('fs');
const { applySpecialCommands } = require('../../src/serverHelper');
const { PlaywrightWorld } = require('../../dist/playwright/playwrightWorld');

const searchTimeout = 15000;

//A little more, as it should be higher than Playwright's timeout
setDefaultTimeout(searchTimeout + 1000);

// Variables for scenario management within PlaywrightWorld
let scenarioCount = 0;
let totalScenarios = 0;

// Error Handling and other helpers
const NotFoundError = (e) => Error(`ElementNotFoundError: ${e}`);

class CustomError extends Error {
	constructor(message) {
		super();
		const cutOff = message.indexOf(': expected');
		this.message = cutOff === -1 ? message : message.substring(0, cutOff);
		this.stack = '';
	}
}

function betterError(error) {
	const myError = new CustomError(error.message);
	return myError;
}

async function handleError(f) {
	try {
		await f();
	} catch (error) {
		throw betterError(error);
	}
}

console.log('We are before PlaywrightWorld creation!');
// Cucumber configuration
setWorldConstructor(PlaywrightWorld);

defineParameterType({
	name: 'Bool',
	regexp: /true|false/,
	transformer: (b) => (b === 'true')
});

// ###################### HOOKS ########################################
Before(async function () {
	console.log('\n=== Starting Test Execution ===');
	console.log('World Parameters:', this.parameters);

	if (scenarioCount === 0) {
		totalScenarios = this.parameters.scenarios.length;
		console.log(`Total scenarios to run: ${totalScenarios}`);
	}
	if (scenarioCount === 0) totalScenarios = this.parameters.scenarios.length;

	// Transfer scenario index to World
	console.log('Scenario count is: ', scenarioCount);
	await this.setScenarioCount(scenarioCount);
	console.log(`Starting Scenario with Index: ${scenarioCount + 1}`);
	await this.launchBrowser(this.parameters.scenarios[scenarioCount]);
});

After(async function ({ pickle, result }) {
	console.log(`\n=== Finishing scenario: ${pickle.name} ===`);
	console.log(`Status: ${result.status}`);
	console.log(`Finished Scenario ${scenarioCount + 1}/${totalScenarios}`);

	// Screenshot if Scenario failed
	if (result.status === Status.FAILED) {
		const timestamp = Date.now();
		const screenshotPath = path.join(this.downloadDir, `${pickle.name}-failed-${timestamp}.png`);
		const img = await this.getPage().screenshot({ path: screenshotPath });
		await this.attach(img, 'image/png');
		console.log(`Screenshot saved: ${screenshotPath}`);
	}
	if (!this.parameters.scenarios[scenarioCount].oneDriver
        || scenarioCount === totalScenarios - 1) await this.closeBrowser();

	// Counter erhöhen oder zurücksetzen
    if (scenarioCount === totalScenarios - 1) {
        scenarioCount = 0;
        totalScenarios = 0;
        console.log("WIR SETZTEN DEN SCENARIOCOUNT ZURÜCK!", scenarioCount, totalScenarios);
        process.env.CUCUMBER_TOTAL_WORKERS = undefined;
        process.env.CUCUMBER_WORKER_ID = undefined;
    } else {
        scenarioCount++;
    }
});

// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
	// await driver.sleep(100 + currentParameters.waitTime);
});

Given('I am on the website: {string}', async function (url) {
	await handleError(async () => {
		try {
			const page = this.getPage();
            //await page.waitForTimeout(searchTimeout + this.parameters.waitTime);
			await page.goto(url);
			await page.waitForLoadState();
		} catch (e) {
			throw Error(e);
		}
	});
});

Given('I add a cookie with the name {string} and value {string}', async function (name, value) {
	await handleError(async () => {
		try {
			const page = this.getPage();
			await page.context().addCookies([{
				name,
				value,
				url: await page.url()
			}]);
		} catch (e) {
			throw Error(e);
		}

		if (this.parameters.waitTime) await this.getPage().waitForTimeout(this.parameters.waitTime);
	});
});

Given('I remove a cookie with the name {string}', async function(name) {
    await handleError(async () => {
        try {
            const context = this.getPage().context();
            const cookies = await context.cookies();
            const filteredCookies = cookies.filter(cookie => cookie.name !== name);
            await context.clearCookies();
            await context.addCookies(filteredCookies);
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Given('I add a session-storage with the name {string} and value {string}', async function(name, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            await page.evaluate(([key, val]) => {
                window.sessionStorage.setItem(key, val);
            }, [name, value]);
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Given('I remove a session-storage with the name {string}', async function(name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            await page.evaluate((key) => {
                window.sessionStorage.removeItem(key);
            }, name);
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Given('I take a screenshot', async function() {
    await handleError(async () => {
        try {
            const page = this.getPage();
            await page.waitForLoadState('domcontentloaded');
            const timestamp = Date.now();
            const screenshotPath = path.join(this.downloadDir, `manual-${timestamp}.png`);
            const buffer = await page.screenshot({ path: screenshotPath });
            await this.attach(buffer, 'image/png');
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Given('I take a screenshot. Optionally: Focus the page on the element {string}', async function(element) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            if (element) {
                const locators = [
                    page.getByRole('generic', { name: element }),
                    page.getByText(element, { exact: true }),
                    page.getByLabel(element),
                    // CSS Selektoren als Fallback
                    page.locator(`#${element}`),
                    page.locator(`[id*="${element}"]`),
                    // XPath als letzte Option
                    page.locator(`//*[contains(text(),"${element}")]`)
                ];

                for (const locator of locators) {
                    try {
                        await locator.scrollIntoViewIfNeeded({ timeout: 1000 });
                        break;
                    } catch {
                        continue;
                    }
                }
            }

            const timestamp = Date.now();
            const screenshotPath = path.join(this.downloadDir, 
                element ? `manual-${element}-${timestamp}.png` : `manual-${timestamp}.png`);
            const buffer = await page.screenshot({ path: screenshotPath });
            await this.attach(buffer, 'image/png');
        } catch (e) {
            throw Error(e);
        }
    });
});



// ################### WHEN ##########################################
// driver navigates to the Website
When('I go to the website: {string}', async function getUrl(url) {
	await handleError(async () => {
		try {
			const page = this.getPage();
			await page.goto(url);
			await page.waitForLoadState('networkidle');
		} catch (e) {
			throw Error(e);
		}
	});
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function(button) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Moderne Playwright Locators in Prioritätsreihenfolge
            const locators = [
                page.getByRole('button', { name: button }),
                page.getByText(button, { exact: true }),
                page.getByLabel(button),
                // CSS Selektoren als Fallback
                page.locator(`#${button}`),
                page.locator(`[id*="${button}"]`),
                // XPath als letzte Option
                page.locator(`//button[contains(text(),"${button}")]`)
            ];

             // Versuche jeden Locator
             for (const locator of locators) {
                try {
                    await locator.click();
                    return;
                } catch {
                    continue;
                }
            }
            throw new Error(`Button ${button} could not be found!`);
        } catch (e) {
            throw e;
        }
    });
});



// Playwright sleeps for a certain amount of time
When('The site should wait for {string} milliseconds', async function(ms) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            await page.waitForTimeout(parseInt(ms, 10));
        } catch (e) {
            throw Error(e);
        }
    });
});


When('I insert {string} into the field {string}', async function(text, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const value = applySpecialCommands(text);
            
            const selectors = [
                `input#${label}`,
                `input[id*="${label}"]`,
                `textarea#${label}`,
                `textarea[id*="${label}"]`,
                `textarea[name="${label}"]`,
                `*[id="${label}"]`,
                `input[type="text"][name="${label}"]`,
                `label:has-text("${label}") + input[type="text"]`,
                `[placeholder="${label}"]`,
                label
            ];

            const locator = page.locator(selectors.join(', '));
            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            await locator.fill(value);
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Input/Textarea ${label} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// "Radio"
When('I select {string} from the selection {string}', async function(radioname, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const selectors = [
                `input[${label}="${radioname}"] + label`,
                `input[${label}*="${radioname}"] + label`,
                `label:has-text("${label}") ~ input[value="${radioname}"] + label`,
                `input[name="${label}"][value="${radioname}"] + label`,
                `input[name*="${label}"] + label:has-text("${radioname}")`,
                `[role="radio"]:has-text("${radioname}")`,
                radioname
            ];

            const locator = page.locator(selectors.join(', '));
            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            await locator.click();
            
            // Wait for radio button selection to be processed
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Radio ${label} with option ${radioname} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// Select an Option from a dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function(value, dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Versuche zuerst das Dropdown zu finden und zu öffnen
            const dropdown = page.locator([
                `select[id*="${dropd}"]`,
                `[aria-label*="${dropd}"]`,
                `[role="combobox"][name*="${dropd}"]`,
                `text=${dropd}`
            ].join(', '));
            
            await dropdown.click();
            
            // Versuche dann die Option zu finden und auszuwählen
            const option = page.locator([
                `option:has-text("${value}")`,
                `[role="option"]:has-text("${value}")`,
                `li:has-text("${value}")`,
                `text=${value}`
            ].join(', '));
            
            await option.click();
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Dropdown ${dropd} with option ${value} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

// Dropdown via Playwright Locator (working?! No? --> Back to XPath):
When('I select the option {string}', async function(dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `[role="option"]:has-text("${dropd}")`,
                `option:has-text("${dropd}")`,
                `li:has-text("${dropd}")`,
                dropd
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            await locator.click();
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Dropdown-option ${dropd} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function(element, option) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Try to find and hover over the element
            const elementLocator = page.locator([
                `text=${element}`,
                `[aria-label="${element}"]`,
                `[title="${element}"]`,
                element
            ].join(', '));

            await elementLocator.waitFor({ state: 'visible', timeout: searchTimeout });
            await elementLocator.hover();
            
            // Wait for hover effect
            await page.waitForTimeout(500);
            
            // Try to find and click the option
            const optionLocator = page.locator([
                `text=${option}`,
                `[aria-label="${option}"]`,
                `[title="${option}"]`,
                option
            ].join(', '));

            await optionLocator.waitFor({ state: 'visible', timeout: searchTimeout });
            await optionLocator.click();
            
            // Wait for any network activity to complete
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Element ${element} or option ${option} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', async () => { });

// Check the Checkbox with a specific name or id
When('I check the box {string}', async function(name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `[type="checkbox"][id="${name}"]`,
                `[type="checkbox"][name="${name}"]`,
                `label:has-text("${name}") input[type="checkbox"]`,
                `[role="checkbox"]:has-text("${name}")`,
                name
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            
            // Check if checkbox is already checked
            const isChecked = await locator.isChecked();
            if (!isChecked) {
                await locator.check();
            }
            
            // Wait for any network activity to complete
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Checkbox ${name} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


When('Switch to the newly opened tab', async function() {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const context = page.context();
            const pages = context.pages();
            
            // Switch to the last opened page
            await pages[pages.length - 1].bringToFront();
            this.page = pages[pages.length - 1];
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


When('Switch to the tab number {string}', async function(numberOfTabs) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const context = page.context();
            const pages = context.pages();
            const tabIndex = parseInt(numberOfTabs, 10);
            
            if (tabIndex === 1) {
                console.log('switchTo: 1st tab');
                await pages[0].bringToFront();
                this.page = pages[0];
            } else {
                const targetIndex = pages.length - (tabIndex - 1);
                if (targetIndex >= 0 && targetIndex < pages.length) {
                    await pages[targetIndex].bringToFront();
                    this.page = pages[targetIndex];
                } else {
                    throw new Error(`Tab index ${tabIndex} is out of range. Available tabs: ${pages.length}`);
                }
            }
            
            await this.getPage().waitForLoadState('networkidle');
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


When('I want to upload the file from this path: {string} into this uploadfield: {string}', async function(file, input) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const filePath = path.join(this.tmpUploadDir, file);
            
            const fileInput = page.locator([
                `input[type="file"][name="${input}"]`,
                `input[type="file"][id="${input}"]`,
                `input[type="file"]`,
                input
            ].join(', '));

            await fileInput.waitFor({ state: 'visible', timeout: searchTimeout });
            await fileInput.setInputFiles(filePath);
            
            // Wait for upload to complete
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Upload Field ${input} could not be found!`);
            }
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// ################### THEN ##########################################
// Checks if the current Website is the one it is supposed to be
Then('So I will be navigated to the website: {string}', async function (url) {
	await handleError(async () => {
		try {
			const page = this.getPage();
			await expect(page).toHaveURL(url.replace(/[\s]|\/\s*$/g, ''));
		} catch (e) {
			throw Error(e);
		}

		if (this.parameters.waitTime) await this.getPage().waitForTimeout(this.parameters.waitTime);
	});
});

const resolveRegex = (rawString) => {
	const string = !rawString ? '' : rawString;
	const regex = /(\{Regex:)(.*)(\})(.*)/g;
	const regexFound = regex.test(string);
	const resultString = regexFound ? string.replace(regex, '$2$4') : string;
	return { resultString, regexFound };
};

// Search a textfield in the html code and assert it with a Text
Then('So I can see the text {string} in the textbox: {string}', async function(expectedText, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const text = applySpecialCommands(expectedText.toString());
            const { resultString, regexFound } = resolveRegex(text);
            
            const locator = page.locator([
                `#${label}`,
                `[id*="${label}"]`,
                `[name="${label}"]`,
                `label:has-text("${label}") + input`,
                `[placeholder="${label}"]`,
                label
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            
            // Get text content using different methods
            let content = await locator.inputValue();
            if (!content) {
                content = await locator.textContent() || '';
            }
            if (!content) {
                content = await locator.getAttribute('outerHTML') || '';
            }

            if (regexFound) {
                await expect(content).toMatch(new RegExp(resultString));
            } else {
                await expect(content).toBe(resultString);
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Textarea ${label} could not be found!`);
            }
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

// Search if a is text in html code
Then('So I can see the text: {string}', async function(text) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const expectedText = applySpecialCommands(text.toString());
            const { resultString, regexFound } = resolveRegex(expectedText);

            await page.waitForLoadState('domcontentloaded');
            
            // Get all text content from the page
            const bodyContent = await page.evaluate(() => {
                const body = document.body;
                return {
                    textContent: body.textContent || '',
                    innerHTML: document.documentElement.innerHTML,
                    outerHTML: document.documentElement.outerHTML
                };
            });
            
            const allContent = bodyContent.textContent + bodyContent.innerHTML + bodyContent.outerHTML;

            if (regexFound) {
                await expect(allContent).toMatch(new RegExp(resultString));
            } else {
                await expect(allContent).toContain(resultString);
            }
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// Search a textfield in the html code and assert if it's empty
Then('So I can\'t see text in the textbox: {string}', async function(label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `#${label}`,
                `[id*="${label}"]`,
                `[name="${label}"]`,
                `[placeholder="${label}"]`,
                label
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            const content = await locator.inputValue();
            await expect(content).toBe('');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Textarea ${label} could not be found!`);
            }
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Then('So a file with the name {string} is downloaded in this Directory {string}', async function(fileName, directory) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const filePath = path.join(this.downloadDir, fileName);
            
            // Wait for file to exist
            await page.waitForTimeout(1000); // Give time for download to complete
            
            // Check if file exists
            await fs.promises.access(filePath, fs.constants.F_OK);
            
            // Rename the file with timestamp
            const timestamp = Date.now();
            const newPath = path.join(
                this.downloadDir, 
                `Seed_Download-${timestamp}_${fileName}`
            );
            
            await fs.promises.rename(filePath, newPath);
        } catch (e) {
            throw new Error(`Download file ${fileName} not found: ${e.message}`);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


Then('So the picture {string} has the name {string}', async function(picture, name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Try to find the image using multiple selectors
            const imageLocator = page.locator([
                `picture:has(source[srcset*="${picture}"])`,
                `picture:has(img[src*="${picture}"])`,
                `img[src*="${picture}"]`,
                `img[alt*="${picture}"]`,
                `img[id="${picture}"]`,
                `img[title*="${picture}"]`
            ].join(', '));

            await imageLocator.waitFor({ state: 'visible', timeout: searchTimeout });
            
            // Check if it's a picture element or img
            const tagName = await imageLocator.evaluate(el => el.tagName.toLowerCase());
            
            let imageSrc = '';
            if (tagName === 'picture') {
                // Check source elements within picture
                const sourceLocator = imageLocator.locator('source');
                const srcset = await sourceLocator.getAttribute('srcset');
                if (srcset?.includes(name)) {
                    imageSrc = srcset;
                }
                
                // Check img fallback if no matching source
                if (!imageSrc) {
                    const imgLocator = imageLocator.locator('img');
                    imageSrc = await imgLocator.getAttribute('src') || await imgLocator.getAttribute('srcset') || '';
                }
            } else {
                // Direct img element
                imageSrc = await imageLocator.getAttribute('src') || await imageLocator.getAttribute('srcset') || '';
            }

            // Verify image source contains the expected name
            if (!imageSrc.includes(name)) {
                throw new Error(`Image source does not contain expected name: ${name}`);
            }

            // Check if image is actually accessible
            const response = await page.request.head(new URL(imageSrc, page.url()).href);
            if (!response.ok()) {
                throw new Error(`Image ${imageSrc} is not accessible`);
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Picture ${picture} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

// Search if a text isn't in html code
Then('So I can\'t see the text: {string}', async function(text) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const expectedText = applySpecialCommands(text.toString());
            const { resultString, regexFound } = resolveRegex(expectedText);

            await page.waitForLoadState('domcontentloaded');
            
            // Get all text content from the page
            const content = await page.evaluate(() => {
                const body = document.body;
                return {
                    textContent: body.textContent || '',
                    innerHTML: document.documentElement.innerHTML,
                    outerHTML: document.documentElement.outerHTML
                };
            });
            
            const allContent = content.textContent + content.innerHTML + content.outerHTML;

            if (regexFound) {
                await expect(allContent).not.toMatch(new RegExp(resultString));
            } else {
                await expect(allContent).not.toContain(resultString);
            }
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


// Check if a checkbox is set (true) or not (false)
Then('So the checkbox {string} is set to {string} [true OR false]', async function(checkboxName, checked1) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `[type="checkbox"][name="${checkboxName}"]`,
                `[type="checkbox"][id="${checkboxName}"]`,
                `label:has-text("${checkboxName}") input[type="checkbox"]`,
                `[role="checkbox"]:has-text("${checkboxName}")`,
                checkboxName
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            const isChecked = await locator.isChecked();
            await expect(isChecked).toBe(checked1 === 'true');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The checkbox ${checkboxName} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Then('So on element {string} the css property {string} is {string}', async function(element, property, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `text=${element}`,
                `#${element}`,
                `[id*="${element}"]`,
                `[role="${element}"]`,
                element
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            
            // Get computed CSS value
            const actual = await locator.evaluate((el, prop) => {
                return window.getComputedStyle(el).getPropertyValue(prop);
            }, property);

            // Handle color values
            if (actual.startsWith('rgb')) {
                const colorNumbers = actual.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
                const [r, g, b] = colorNumbers.map(v => Number(v).toString(16).padStart(2, '0'));
                const hex = `#${r}${g}${b}`;
                await expect(value.toLowerCase()).toBe(hex.toLowerCase());
            } else {
                await expect(actual).toBe(value);
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Element ${element} could not be found!`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

Then('So the element {string} has the tool-tip {string}', async function(element, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locator = page.locator([
                `[title="${value}"]`,
                `[aria-label="${value}"]`,
                `[data-tooltip="${value}"]`,
                `[role="tooltip"]`,
                `text=${element}`,
                `#${element}`,
                element
            ].join(', '));

            await locator.waitFor({ state: 'visible', timeout: searchTimeout });
            
            // Check different tooltip attributes
            const title = await locator.getAttribute('title');
            const ariaLabel = await locator.getAttribute('aria-label');
            const dataTooltip = await locator.getAttribute('data-tooltip');
            
            // Verify tooltip content
            const tooltipContent = title || ariaLabel || dataTooltip;
            await expect(tooltipContent).toBe(value);
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Element ${element} could not be found (check tool-tip).`);
            }
            throw e;
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});


Then('So the cookie {string} has the value {string}', async function(name, expectedValue) {
    await handleError(async () => {
        try {
            const context = this.getPage().context();
            const cookies = await context.cookies();
            const cookie = cookies.find(c => c.name === name);
            await expect(cookie?.value).toBe(expectedValue);
        } catch (e) {
            throw Error(e);
        }

        if (this.parameters.waitTime) {
            await this.getPage().waitForTimeout(this.parameters.waitTime);
        }
    });
});

