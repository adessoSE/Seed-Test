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

// Überarbeiten, page Problem
async function takeScreenshot(inputPage=undefined) {
    try { 
        const page = inputPage == undefined ? await this.getPage() : inputPage;
        const timestamp = Date.now();
        const screenshotPath = path.join(this.downloadDir, `manual-${timestamp}.png`);
        const buffer = await page.screenshot({ path: screenshotPath });
        await this.attach(buffer, 'image/png');
    } catch (error) {
        console.error("Screenshot creation failed!")
        throw error;
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
    });
});

Given('I take a screenshot', async function() {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const timestamp = Date.now();
            const screenshotPath = path.join(this.downloadDir, `manual-${timestamp}.png`);
            const buffer = await page.screenshot({ path: screenshotPath });
            await this.attach(buffer, 'image/png');
        } catch (e) {
            throw Error(e);
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
			await page.waitForLoadState();
		} catch (e) {
			throw Error(e);
		}
	});
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function(button) {
    await handleError(async () => {
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
            const promises = [];
            
            for (const locator of locators) {
                promises.push(locator.click());
            }

            await Promise.any(promises);
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
            
            const locators = [
                // Modern Locators
                page.getByLabel(label),
                page.getByPlaceholder(label),
                page.getByRole('textbox', { name: label }),
                // CSS Fallbacks
                page.locator(`input#${label}`),
                page.locator(`textarea#${label}`),
                page.locator(`[id="${label}"]`),
                page.locator(`[name="${label}"]`),
                // Complex Selectors
                page.locator(`label:has-text("${label}") + input`),
                page.locator(`label:has-text("${label}") + textarea`)
            ];

            for (const locator of locators) {
                try {
                    await locator.fill(value);
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            throw e;
        }
    });
});



// "Radio"
When('I select {string} from the selection {string}', async function(radioname, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('radio', { name: radioname }),
                page.getByLabel(label).filter({ hasText: radioname }),
                page.getByText(radioname).filter({ has: page.locator('input[type="radio"]') }),
                // CSS Fallbacks
                page.locator(`input[name="${label}"][value="${radioname}"]`),
                page.locator(`[role="radio"]:has-text("${radioname}")`),
                // XPath as last resort
                page.locator(`//input[@type="radio"][@value="${radioname}"]`)
            ];

            for (const locator of locators) {
                try {
                    await locator.click();
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Radio ${label} with option ${radioname} could not be found!`);
            }
            throw e;
        }
    });
});


// Select an Option from a dropdown-menu
When('I select the option {string} from the drop-down-menue {string}', async function(value, dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Dropdown locators in priority order
            const dropdownLocators = [
                // Modern Locators
                page.getByRole('combobox', { name: dropd }),
                page.getByLabel(dropd),
                page.getByText(dropd).filter({ has: page.locator('select') }),
                // CSS Fallbacks
                page.locator(`select[id="${dropd}"]`),
                page.locator(`[role="combobox"][name="${dropd}"]`),
                page.locator(`[aria-label="${dropd}"]`)
            ];

            // Option locators in priority order
            const optionLocators = [
                // Modern Locators
                page.getByRole('option', { name: value }),
                page.getByText(value).filter({ has: page.locator('option') }),
                // CSS Fallbacks
                page.locator(`option:has-text("${value}")`),
                page.locator(`[role="option"]:has-text("${value}")`),
                page.locator(`li:has-text("${value}")`)
            ];

            // Try to find and click dropdown
            for (const dropdownLocator of dropdownLocators) {
                try {
                    await dropdownLocator.click();
                    break;
                } catch {
                    continue;
                }
            }

            // Try to find and click option
            for (const optionLocator of optionLocators) {
                try {
                    await optionLocator.click();
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Dropdown ${dropd} with option ${value} could not be found!`);
            }
            throw e;
        }
    });
});

// Dropdown via Playwright Locator (working?! No? --> Back to XPath):
When('I select the option {string}', async function(dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('option', { name: dropd }),
                page.getByText(dropd).filter({ has: page.locator('select') }),
                // CSS Fallbacks
                page.locator(`select option:has-text("${dropd}")`),
                page.locator(`[role="listbox"] [role="option"]:has-text("${dropd}")`),
                // Direct selection without opening dropdown
                page.locator('select').locator(`option:has-text("${dropd}")`),
                // Legacy support
                page.locator(`//select/option[text()="${dropd}"]`)
            ];

            for (const locator of locators) {
                try {
                    await locator.click();
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Dropdown-option ${dropd} could not be found!`);
            }
            throw e;
        }
    });
});


// Hover over element and Select an Option
When('I hover over the element {string} and select the option {string}', async function(element, option) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            const elementLocators = [
                // Modern Locators
                page.getByRole('button', { name: element }),
                page.getByText(element, { exact: true }),
                page.getByLabel(element),
                // CSS Fallbacks
                page.locator(`[title="${element}"]`),
                page.locator(`[aria-label="${element}"]`)
            ];

            // Try each element locator
            for (const locator of elementLocators) {
                try {
                    await locator.hover();
                    
                    // Try to find and click the option
                    const optionLocators = [
                        page.getByRole('menuitem', { name: option }),
                        page.getByText(option, { exact: true }),
                        page.getByLabel(option),
                        page.locator(`[title="${option}"]`),
                        page.locator(`[aria-label="${option}"]`)
                    ];

                    for (const optionLocator of optionLocators) {
                        try {
                            await optionLocator.click();
                            return;
                        } catch {
                            continue;
                        }
                    }
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Element ${element} or option ${option} could not be found!`);
            }
            throw e;
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
            const locators = [
                // Modern Locators
                page.getByRole('checkbox', { name: name }),
                page.getByLabel(name),
                // CSS Fallbacks
                page.locator(`[type="checkbox"][id="${name}"]`),
                page.locator(`[type="checkbox"][name="${name}"]`),
                // Complex Selectors
                page.locator(`label:has-text("${name}") input[type="checkbox"]`)
            ];

            for (const locator of locators) {
                try {
                    await locator.check()
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Checkbox ${name} could not be found!`);
            }
            throw e;
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
    });
});


When('I want to upload the file from this path: {string} into this uploadfield: {string}', async function(file, input) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const filePath = path.join(this.tmpUploadDir, file);
            
            const locators = [
                // Modern Locators
                page.getByRole('textbox', { name: input }),
                page.getByLabel(input),
                // File Input Specific
                page.locator(`input[type="file"][name="${input}"]`),
                page.locator(`input[type="file"][id="${input}"]`),
                // Generic Fallback
                page.locator('input[type="file"]')
            ];

            for (const locator of locators) {
                try {
                    await locator.setInputFiles(filePath);
                    return;
                } catch {
                    continue;
                }
            }
            // Wait for upload to complete
            await page.waitForLoadState('networkidle');
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Upload Field ${input} could not be found!`);
            }
            throw Error(e);
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
            
            const locators = [
                // Modern Locators
                page.getByRole('textbox', { name: label }),
                page.getByLabel(label),
                page.getByPlaceholder(label),
                // CSS Fallbacks
                page.locator(`#${label}`),
                page.locator(`[name="${label}"]`),
                page.locator(`label:has-text("${label}") + input`)
            ];

            for (const locator of locators) {
                try {
                    // Try to get content using different methods
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
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`Textarea ${label} could not be found!`);
            }
            throw Error(e);
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

            const locators = [
                // Modern Locators
                page.getByText(resultString, { exact: !regexFound }),
                // Fallback content checks
                page.locator('body'),
                page.locator('html')
            ];

            for (const locator of locators) {
                try {
                    if (regexFound) {
                        await expect(locator).toHaveText(new RegExp(resultString));
                        return;
                    } else {
                        await expect(locator).toContainText(resultString);
                        return;
                    }
                } catch {
                    continue;
                }
            }
        } catch (e) {
            throw Error(e);
        }
    });
});


// Search a textfield in the html code and assert if it's empty
Then('So I can\'t see text in the textbox: {string}', async function(label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('textbox', { name: label }),
                page.getByLabel(label),
                page.getByPlaceholder(label),
                // CSS Fallbacks
                page.locator(`#${label}`),
                page.locator(`[name="${label}"]`)
            ];

            for (const locator of locators) {
                try {
                    const content = await locator.inputValue();
                    await expect(content).toBe('');
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Textarea ${label} could not be found!`);
            }
            throw Error(e);
        }
    });
});

Then('So a file with the name {string} is downloaded in this Directory {string}', async function(fileName, directory) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            // Wait for download
            const downloadPromise = page.waitForEvent('download');
            const download = await downloadPromise;
            
            // Verify filename
            const suggestedFilename = download.suggestedFilename();
            expect(suggestedFilename).toBe(fileName);
            
            // Save file with timestamp
            const timestamp = Date.now();
            const newPath = path.join(
                this.downloadDir,
                `Seed_Download-${timestamp}_${fileName}`
            );
            
            await download.saveAs(newPath);
            
            // Verify file exists
            const fileExists = fs.existsSync(newPath);
            if (!fileExists) {
                throw new Error(`Download file ${fileName} could not be saved`);
            }
        } catch (e) {
            throw new Error(`Download file ${fileName} failed: ${e.message}`);
        }
    });
});


Then('So the picture {string} has the name {string}', async function(picture, name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('img', { name: picture }),
                page.getByAltText(picture),
                // CSS Fallbacks
                page.locator(`img[src*="${picture}"]`),
                page.locator(`img[src*="${name}"]`)
            ];

            for (const locator of locators) {
                try {
                    await locator.isVisible();
                    const src = await locator.getAttribute('src');
                    if (src?.includes(name)) {
                        return;
                    }
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Picture ${picture} could not be found!`);
            }
            throw e;
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

            const locators = [
                // Modern Locators
                page.getByText(resultString, { exact: !regexFound }),
                // Fallback content checks
                page.locator('body'),
                page.locator('html')
            ];

            for (const locator of locators) {
                try {
                    if (regexFound) {
                        await expect(locator).not.toHaveText(new RegExp(resultString));
                    } else {
                        await expect(locator).not.toContainText(resultString);
                    }
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            throw new Error(`Unexpected text "${text}" was found on the page!`);
        }
    });
});


// Check if a checkbox is set (true) or not (false)
Then('So the checkbox {string} is set to {string} [true OR false]', async function(checkboxName, checked1) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('checkbox', { name: checkboxName }),
                page.getByLabel(checkboxName),
                // CSS Fallbacks
                page.locator(`[type="checkbox"][name="${checkboxName}"]`),
                page.locator(`[type="checkbox"][id="${checkboxName}"]`),
                // Complex Selectors
                page.locator(`label:has-text("${checkboxName}") input[type="checkbox"]`)
            ];

            for (const locator of locators) {
                try {
                    const isChecked = await locator.isChecked();
                    await expect(isChecked).toBe(checked1 === 'true');
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The checkbox ${checkboxName} could not be found!`);
            }
            throw e;
        }
    });
});

Then('So on element {string} the css property {string} is {string}', async function(element, property, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('generic', { name: element }),
                page.getByText(element, { exact: true }),
                page.getByLabel(element),
                // CSS Fallbacks
                page.locator(`#${element}`),
                page.locator(`[role="${element}"]`),
                // Complex Selectors
                page.locator(`[data-testid="${element}"]`)
            ];

            for (const locator of locators) {
                try {
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
                        return;
                    }
                    
                    await expect(actual).toBe(value);
                    return;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Element ${element} could not be found!`);
            }
            throw e;
        }
    });
});

Then('So the element {string} has the tool-tip {string}', async function(element, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const locators = [
                // Modern Locators
                page.getByRole('tooltip', { name: value }),
                page.getByLabel(value),
                // Element Locators
                page.getByText(element).filter({ has: page.locator('[role="tooltip"]') }),
                // Attribute Fallbacks
                page.locator(`[title="${value}"]`),
                page.locator(`[aria-label="${value}"]`),
                page.locator(`[data-tooltip="${value}"]`)
            ];

            for (const locator of locators) {
                try {
                    // Try to get tooltip content from various attributes
                    const title = await locator.getAttribute('title');
                    const ariaLabel = await locator.getAttribute('aria-label');
                    const dataTooltip = await locator.getAttribute('data-tooltip');
                    
                    const tooltipContent = title || ariaLabel || dataTooltip;
                    if (tooltipContent === value) {
                        return;
                    }
                } catch {
                    continue;
                }
            }
        } catch (e) {
            if (e.name === 'TimeoutError') {
                throw new Error(`The Element ${element} could not be found (check tool-tip).`);
            }
            throw e;
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
    });
});

