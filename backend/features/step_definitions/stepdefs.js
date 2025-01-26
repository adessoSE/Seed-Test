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
    myError.stack = error.stack;
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


/* 
LEGENDE für Identifier-Übersicht:
- (X) Direkt abgedeckt: Der Selenium-Identifikator wird durch den Playwright-Code direkt und äquivalent abgedeckt. 
Es gibt eine klare 1:1-Entsprechung oder eine sehr ähnliche und robuste Implementierung in Playwright.

- (/) Indirekt abgedeckt: Der Selenium-Identifikator wird durch den Playwright-Code indirekt abgedeckt. 
Das bedeutet, dass der Playwright-Code zwar eine ähnliche Funktionalität erreicht, aber nicht genau denselben Selektor oder dieselbe Strategie verwendet. 
Es besteht die Möglichkeit, dass die Abdeckung nicht in allen Fällen perfekt ist oder dass alternative Implementierungen in Playwright robuster wären.

- (-) Nicht abgedeckt / Nicht empfehlenswert: Der Selenium-Identifikator wird durch den aktuellen Playwright-Code nicht abgedeckt. 
Es gibt entweder keine praktikable oder keine empfehlenswerte Entsprechung in Playwright (z.B. wegen Instabilität oder Performance). 
Hier sind alternative Ansätze in Playwright erforderlich oder der ursprüngliche Selenium-Ansatz sollte überdacht werden.

- ( ) Noch nicht geprüft: Diese Markierung dient als Platzhalter für Identifikatoren, die noch nicht im Kontext des Playwright-Codes betrachtet wurden. 
Sie werden im Laufe der Analyse durch (X), (/) oder (-) ersetzt. 

  */

// ###################### OVERARCHING HELPER FUNCTIONS #################

//TODO: Vielleicht eine XPAth-AttributsWIldcardconverter Funktion? Playwright unterstützt (vermutlich) keine @* Wildcards...

async function mapLocatorsToPromises(locators, action, value=undefined, ...args) {

    //toHaveAttribute needs special handling as we have to return as many promises as many Attributes we check
    if (action === 'toHaveAttribute') {
        return locators.map(locator => {
            const promises = args.map(attribute => locator.toHaveAttribute(attribute, value));
            return Promise.any(promises);
        });
    }

    //you can Include timeouts for each action, but for now we use central action timeout in PlaywrightWorld

    console.log(locators, action, value, ...args)
    return Promise.any(locators.map(locator => {
        console.log(locators);
        switch (action) {
            case 'waitFor':
                return locator
                .waitFor({ state: 'attached' })
                .catch(e => {
                    console.warn(`waitFor failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'click':
                return locator
                .click()
                .catch(e => {
                    console.warn(`Click failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'fill':
                return locator
                .fill(...args)
                .catch(e => {
                    console.warn(`fill failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'setInputFiles':
                return locator
                .setInputFiles(...args)
                .catch(e => {
                    console.warn(`setInputFiles failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'toHaveText':
                return expect(locator)
                .toHaveText(...args)
                .catch(e => {
                    console.warn(`toHaveText failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'toContainText':
                return expect(locator)
                .toContainText(...args)
                .catch(e => {
                    console.warn(`toContainText failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'not.toHaveText':
                return expect(locator)
                .not.toHaveText(...args)
                .catch(e => {
                    console.warn(`not.toHaveText failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'not.toContainText':
                return expect(locator)
                .not.toContainText(...args)
                .catch(e => {
                    console.warn(`not.toContainText failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'textContent':
                return expect(locator)
                .textContent()
                .catch(e => {
                    console.warn(`textContent failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'inputValue':
                return expect(locator)
                .inputValue()
                .catch(e => {
                    console.warn(`inputValue failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'toBeEnabled':
                return expect(locator)
                .toBeEnabled()
                .catch(e => {
                    console.warn(`toBeEnabled failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'toBeDisabled':
                return expect(locator)
                .toBeDisabled()
                .catch(e => {
                    console.warn(`toBeDisabled failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            case 'toBeChecked':
                return expect(locator)
                .toBeChecked()
                .catch(e => {
                    console.warn(`toBeChecked failed for ${locator.toString()}: ${e.message}`);
                    return Promise.reject(e); 
                });
            default:
                throw new Error(`Invalid action: ${action}`);
        }
    }));
}
// / #################### GIVEN ########################################
Given('As a {string}', async function (string) {
	this.role = string;
	// await driver.sleep(100 + currentParameters.waitTime);
});

Given('I am on the website: {string}', async function (url) {
	await handleError(async () => {
		try {
			const page = this.getPage();
			await page.goto(url);
			await page.waitForLoadState();
            //await page.waitForTimeout(searchTimeout + this.parameters.waitTime);
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

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@id='${element}'], XPath
 * (X) //*[@*='${element}'], XPath (Attributsuche, sehr allgemein)
 * (X) //*[contains(@id, '${element}')], XPath (enthält)
 * (X) ${element}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Given('I take a screenshot. Optionally: Focus the page on the element {string}', async function(element) {
    await handleError(async () => {
        try {
            const page = this.getPage();

            if (element) {
                const preferredLocators = [
                    page.getByRole('generic', { name: element }),
                    page.getByText(element, { exact: true }),
                    page.getByLabel(element),
                    page.locator(`#${element}`),
                    page.locator(`[id*="${element}"]`)
                ];

                const xpathLocators = [
                    page.locator(`xpath=//*[contains(text(),"${element}")]`),
                    page.locator(`xpath=//*[@*="${element}"]`),
                    page.locator(`xpath=//*[contains(@id, "${element}")]`),
                    page.locator(`xpath=//*[@id="${element}"]`),
                    page.locator(`xpath=//*[@name="${element}"]`)
                ];

                let locator;
                try {
                    locator = await mapLocatorsToPromises(preferredLocators, 'waitFor');
                } catch (preferredError) {
                    //Nur wenn alle preferred Locators fehlschlagen => xPath
                    locator = await mapLocatorsToPromises(xpathLocators, 'waitFor');
                }

                try {
                    await locator.scrollIntoViewIfNeeded({ timeout: 1000 });
                } catch (scrollError) {
                    console.warn("Scrollen zum Element fehlgeschlagen:", scrollError.message);
                }

                // Screenshot logic (bleibt gleich)
                const timestamp = Date.now();
                const screenshotPath = path.join(this.downloadDir, element ? `manual-${element}-${timestamp}.png` : `manual-${timestamp}.png`);
                const buffer = await page.screenshot({ path: screenshotPath });
                await this.attach(buffer, 'image/png');
            }else {
                const timestamp = Date.now();
                const screenshotPath = path.join(this.downloadDir, element ? `manual-${element}-${timestamp}.png` : `manual-${timestamp}.png`);
                const buffer = await page.screenshot({ path: screenshotPath });
                await this.attach(buffer, 'image/png');
            }
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

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@id='${button}'], XPath (ID)
 * (X) //*[contains(@id,'${button}')], XPath (enthält ID)
 * (X) //*[text()='${button}' or @*='${button}'], XPath (Text oder Attribut)
 * (X) //*[contains(text(),'${button}')], XPath (enthält Text)
 * (X) ${button}, Implizite Suche (ID oder Name, kontextabhängig)
 */
When('I click the button: {string}', async function(button) {
    await handleError(async () => {
        try {
            const page = this.getPage();
    
            const preferredLocators = [
                page.getByRole('button', { name: button }),
                page.getByText(button, { exact: true }),
                page.getByLabel(button),
                page.locator(`#${button}`),
                page.locator(`[id*="${button}"]`)
            ];
    
            const xpathLocators = [
                page.locator(`xpath=//*[@id="${button}"]`),
                page.locator(`xpath=//*[contains(@id,"${button}")]`),
                page.locator(`xpath=//*[text()="${button}"]`),
                page.locator(`xpath=//*[@*="${button}"]`),
                page.locator(`xpath=//*[contains(text(),"${button}")]`),
                page.locator(`xpath=//button[text()="${button}"]`),
                page.locator(`xpath=//button[contains(text(),"${button}")]`),
                page.locator(`xpath=//*[@name="${button}"]`) 
            ];
    
            try {
                await mapLocatorsToPromises(preferredLocators, 'click');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'click');
            }
        } catch (error) {
            throw Error(error);
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

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //input[@id='${label}'], XPath (Input mit ID)
 * (X) //input[contains(@id,'${label}')], XPath (Input enthält ID)
 * (X) //textarea[@id='${label}'], XPath (Textarea mit ID)
 * (X) //textarea[contains(@id,'${label}')], XPath (Textarea enthält ID)
 * (X) //textarea[@*='${label}'], XPath (Textarea mit Attribut)
 * (X) //textarea[contains(@*='${label}')], XPath (Textarea enthält Attribut)
 * (X) //*[@id='${label}'], XPath (mit ID)
 * (X) //input[@type='text' and @*='${label}'], XPath (Input Typ Text und Attribut)
 * (X) //label[contains(text(),'${label}')]/following::input[@type='text'], XPath (Input nach Label mit Text)
 * (X) ${label}, Implizite Suche (ID oder Name, kontextabhängig)
 */
When('I insert {string} into the field {string}', async function(text, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const value = applySpecialCommands(text);
            
            const preferredLocators = [
                page.getByLabel(label),
                page.getByPlaceholder(label),
                page.getByRole('textbox', { name: label }),
                page.locator(`input#${label}`),
                page.locator(`textarea#${label}`),
                page.locator(`[id="${label}"]`),
                page.locator(`[name="${label}"]`),
                page.locator(`label:has-text("${label}") + input`),
                page.locator(`label:has-text("${label}") + textarea`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//input[@id="${label}"]`),
                page.locator(`xpath=//input[contains(@id,"${label}")]`),
                page.locator(`xpath=//textarea[@id="${label}"]`),
                page.locator(`xpath=//textarea[contains(@id,"${label}")]`),
                page.locator(`xpath=//textarea[@*="${label}"]`),
                page.locator(`xpath=//textarea[contains(@*,"${label}")]`),
                page.locator(`xpath=//*[@id="${label}"]`),
                page.locator(`xpath=//input[@type='text' and @*="${label}"]`),
                page.locator(`xpath=//label[contains(text(),"${label}")]/following::input[@type='text']`)
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'fill', value);
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'fill', value);
            }
        } catch (e) {
            throw e;
        }
    });
});



// "Radio"
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //input[@${label}='${radioname}']/following-sibling::label[1], XPath (Input mit dynamischem Attribut und folgendem Label)
 * (X) //input[contains(@${label}, '${radioname}')]/following-sibling::label[1], XPath (Input mit enthaltendem dynamischem Attribut und folgendem Label)
 * (X) //label[contains(text(), '${label}')]/following::input[@value='${radioname}']/following-sibling::label[1], XPath (Label mit Text, folgender Input mit Wert, folgender Label)
 * (X) //input[@name='${label}' and @value='${radioname}']/following-sibling::label[1], XPath (Input mit Name und Wert, folgender Label)
 * (X) //input[contains(@*,'${label}')]/following-sibling::label[contains(text(), '${radioname}')], XPath (Input mit enthaltendem Attribut, folgender Label mit enthaltendem Text)
 * (X) ${radioname}, Implizite Suche (ID oder Name, kontextabhängig)
 */
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
            ];

            const preferredLocators = [
                page.getByRole('radio', { name: radioname }),
                page.getByLabel(label).filter({ hasText: radioname }),
                page.getByText(radioname).filter({ has: page.locator('input[type="radio"]') }),
                page.locator(`input[name="${label}"][value="${radioname}"]`),
                page.locator(`[role="radio"]:has-text("${radioname}")`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//input[@${label}="${radioname}"]/following-sibling::label[1]`),
                page.locator(`xpath=//input[contains(@${label}, "${radioname}")]/following-sibling::label[1]`),
                page.locator(`xpath=//label[contains(text(), '${label}')]/following::input[@value="${radioname}"]/following-sibling::label[1]`),
                page.locator(`xpath=//input[@name="${label}" and @value="${radioname}"]/following-sibling::label[1]`),
                page.locator(`xpath=//input[contains(@*,'${label}')]/following-sibling::label[contains(text(), '${radioname}')]`)
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'click');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'click');
            }
        } catch (e) {
            throw e;
        }
    });
});


// Select an Option from a dropdown-menu
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@*='${dropd}']/option[text()='${value}'], XPath (Element mit Attribut und Option mit Text)
 * (X) //label[contains(text(),'${dropd}')]/following::button[text()='${value}'], XPath (Label mit Text, folgender Button mit Text)
 * (X) //label[contains(text(),'${dropd}')]/following::span[text()='${value}'], XPath (Label mit Text, folgender Span mit Text)
 * (X) //*[contains(text(),'${dropd}')]/following::*[contains(text(),'${value}'], XPath (Element mit enthaltendem Text, folgendes Element mit enthaltendem Text)
 * (X) //*[@role='listbox']//*[self::li[@role='option' and text()='${value}'] or parent::li[@role='option' and text()='${value}']], XPath (Listbox mit Option (selbst oder Elternteil))
 * (X) ${dropd}//option[contains(text(),'${value}') or contains(@id, '${value}') or contains(@*,'${value}')], XPath (Implizite Suche und Option mit enthaltendem Text/ID/Attribut)
 */
When('I select the option {string} from the drop-down-menue {string}', async function(value, dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();

            const preferredDropdownLocators = [
                page.getByRole('combobox', { name: dropd }),
                page.getByLabel(dropd),
                page.getByText(dropd).filter({ has: page.locator('select') }),
                page.locator(`select[id="${dropd}"]`),
                page.locator(`[role="combobox"][name="${dropd}"]`),
                page.locator(`[aria-label="${dropd}"]`)
            ];

            const xpathDropdownLocators = [
                page.locator(`xpath=//*[@*="${dropd}"]`),
                page.locator(`xpath=//label[contains(text(),'${dropd}')]/following::button`),
                page.locator(`xpath=//label[contains(text(),'${dropd}')]/following::span`),
                page.locator(`xpath=//*[contains(text(),'${dropd}')]/following::*`),
                page.locator(`xpath=//*[@role='listbox']`),
                page.locator(`xpath=//*[contains(text(),'${dropd}')]`)
            ];

            const preferredOptionLocators = [
                page.getByRole('option', { name: value }),
                page.getByText(value).filter({ has: page.locator('option') }),
                page.locator(`option:has-text("${value}")`),
                page.locator(`[role="option"]:has-text("${value}")`),
                page.locator(`li:has-text("${value}")`)
            ];

            const xpathOptionLocators = [
                page.locator(`xpath=//*[@*="${dropd}"]/option[text()="${value}"]`),
                page.locator(`xpath=//label[contains(text(),'${dropd}')]/following::button[text()='${value}']`),
                page.locator(`xpath=//label[contains(text(),'${dropd}')]/following::span[text()='${value}']`),
                page.locator(`xpath=//*[contains(text(),'${dropd}')]/following::*[contains(text(),'${value}')]`),
                page.locator(`xpath=//*[@role='listbox']//*[self::li[@role='option' and text()='${value}'] or parent::li[@role='option' and text()='${value}']]`),
                page.locator(`xpath=${dropd}//option[contains(text(),'${value}') or contains(@id, '${value}') or contains(@*,'${value}')]`)
            ];

            let dropdownLocator;
            try {
                dropdownLocator = await mapLocatorsToPromises(preferredDropdownLocators, 'click');
            } catch (preferredDropdownError) {
                dropdownLocator = await mapLocatorsToPromises(xpathDropdownLocators, 'click');
            }

            let optionLocator;
            try {
                optionLocator = await mapLocatorsToPromises(preferredOptionLocators, 'click');
            } catch (preferredOptionError) {
                optionLocator = await mapLocatorsToPromises(xpathOptionLocators, 'click');
            }

        } catch (e) {
            throw e;
        }
    });
});

// Dropdown via Playwright Locator:
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (/) By.xpath(`${dropd}`), XPath (Dynamischer XPath)
 */
When('I select the option {string}', async function(dropd) {
    await handleError(async () => {
        try {
            const page = this.getPage();

            try {
                // 1. Versuche es mit selectOption (für Standard <select>-Elemente)
                await page.locator('select').selectOption(dropd);
                return; // Erfolgreich!
            } catch (selectError) {
                console.warn(`selectOption by text failed, trying select by value: ${selectError.message}`);
                try{
                    await page.locator('select').selectOption({value: optionText.toLowerCase()});
                    return;
                } catch (selectValueError){
                    console.warn(`selectOption by value failed, trying other methods: ${selectValueError.message}`);
                }    
            }

            const preferredLocators = [
                page.getByRole('option', { name: dropd }),
                page.getByText(dropd).filter({ has: page.locator('select') }),
                page.locator(`select option:has-text("${dropd}")`),
                page.locator(`[role="listbox"] [role="option"]:has-text("${dropd}")`),
                page.locator('select').locator(`option:has-text("${dropd}")`),
                page.locator(`:text("${dropd}")`).click()
            ];

            //Dynamischer XPath nur begrenzt in Playwright darstellbar - theoretisch über prefferedLocators gut abgedeckt
            const xpathLocators = [
                page.locator(`//*[normalize-space(text())="${dropd}"]`, {hasText: dropd}),
                page.locator(`xpath=//select/option[text()="${dropd}"]`), //Allgemeiner Select Fall
                page.locator(`xpath=//*[@role='option'][text()="${dropd}"]`), // Sehr spezifisch für ARIA-Optionen
                page.locator(`xpath=//*[@role='listbox']//*[text()='${dropd}']`), // Für Listboxen
                page.locator(`xpath=//li[text()="${dropd}"]`), // Für Listen-Einträge
                page.locator(`xpath=//span[text()="${dropd}"]`), // Für Spans
                page.locator(`xpath=//*[contains(text(), "${dropd}")]`) // Allgemeiner Fallback (nur als letzte Option)
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'click');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'click');
            }
        } catch (e) {
            throw e;
        }
    });
});


// Hover over element and Select an Option
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) `${element}`, XPath (Dynamischer XPath für das zu hovernde Element)
 * (X) `${option}`, XPath (Dynamischer XPath für die auszuwählende Option)
 * (X) `//*[contains(text(),'${element}')]`, XPath (Element mit enthaltendem Text, Fallback für das zu hovernde Element)
 * (X) `//*[contains(text(),'${element}')]/following::*[text()='${option}']`, XPath (Element mit enthaltendem Text und folgendem Element mit Text, Fallback für die Auswahl)
 * (X) `//*[contains(text(),'${option}')]`, XPath (Element mit enthaltendem Text, weiterer Fallback für die Auswahl)
 */
When('I hover over the element {string} and select the option {string}', async function(element, option) {
    await handleError(async () => {
        try {
            const page = this.getPage();

            const preferredElementLocators = [
                page.getByRole('button', { name: element }),
                page.getByText(element, { exact: true }),
                page.getByLabel(element),
                page.locator(`[title="${element}"]`),
                page.locator(`[aria-label="${element}"]`)
            ];
            const xpathElementLocators = [
                page.locator(`xpath=//*[contains(text(),'${element}')]`)
            ];

            let hoveredElement;
            try {
                hoveredElement = await mapLocatorsToPromises(preferredElementLocators, 'hover');
            } catch (preferredElementError) { 
                hoveredElement = await mapLocatorsToPromises(xpathElementLocators, 'hover');
            }

            const preferredOptionLocators = [
                page.getByRole('menuitem', { name: option }),
                page.getByText(option, { exact: true }),
                page.getByLabel(option),
                page.locator(`[title="${option}"]`),
                page.locator(`[aria-label="${option}"]`)
            ];

            const xpathOptionLocators = [
                page.locator(`xpath=//*[contains(text(),'${element}')]/following::*[text()='${option}']`),
                page.locator(`xpath=//*[contains(text(),'${option}')]`)
            ];

            try {
                await mapLocatorsToPromises(preferredOptionLocators, 'click');
            } catch (preferredOptionError) {
                await mapLocatorsToPromises(xpathOptionLocators, 'click');
            }

        } catch (e) {
            throw e;
        }
    });
});

// TODO:
When('I select from the {string} multiple selection, the values {string}{string}{string}', async () => { });

// Check the Checkbox with a specific name or id
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@type="checkbox" and @*="${name}"], XPath (Checkbox mit Attribut und dynamischem Wert)
 * (X) //*[contains(text(),'${name}')]//parent::label, XPath (Element mit enthaltenem Text, Elternteil Label)
 * (X) //*[contains(text(),'${name}') or @*='${name}'], XPath (Element mit enthaltenem Text oder Attribut mit dynamischem Wert)
 * (X) ${name}
 */
When('I check the box {string}', async function(name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            const preferredLocators = [
                page.getByRole('checkbox', { name: name }),
                page.getByLabel(name),
                page.locator(`[type="checkbox"][id="${name}"]`),
                page.locator(`[type="checkbox"][name="${name}"]`),
                page.locator(`label:has-text("${name}") input[type="checkbox"]`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[@type="checkbox" and @*="${name}"]`),
                page.locator(`xpath=//*[contains(text(),'${name}')]//parent::label`),
                page.locator(`xpath=//*[contains(text(),'${name}') or @*='${name}']`)
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'check');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'check');
            }
        } catch (e) {
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

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //input[@*='${input}'], XPath (Input mit Attribut)
 * (X) ${input}, Implizite Suche (ID oder Name, kontextabhängig)
 */
When('I want to upload the file from this path: {string} into this uploadfield: {string}', async function(file, input) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const filePath = path.join(this.tmpUploadDir, file);
            
            const preferredLocators = [
                page.getByRole('textbox', { name: input }),
                page.getByLabel(input),
                page.locator(`input[type="file"][name="${input}"]`),
                page.locator(`input[type="file"][id="${input}"]`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//input[@*='${input}']`) // Playwright doesn't support implicit searching
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'setInputFiles', filePath);
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'setInputFiles', filePath);

            }

            // Wait for upload to complete
            await page.waitForLoadState('networkidle');
        } catch (e) {
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
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@id='${label}'], XPath (Element mit ID)
 * (X) //*[@*='${label}'], XPath (Element mit Attribut)
 * (X) //*[contains(@*, '${label}')], XPath (Element mit enthaltendem Attribut)
 * (X) //label[contains(text(),'${label}')]/following::input[@type='text'], XPath (Label mit enthaltendem Text, folgender Input vom Typ Text)
 * (X) ${label}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So I can see the text {string} in the textbox: {string}', async function(expectedText, label) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const text = applySpecialCommands(expectedText.toString());
            const { resultString, regexFound } = resolveRegex(text);

            const preferredLocators = [
                page.getByRole('textbox', { name: label }),
                page.getByLabel(label),
                page.getByPlaceholder(label),
                page.locator(`#${label}`),
                page.locator(`[name="${label}"]`),
                page.locator(`label:has-text("${label}") + input`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[@id='${label}']`),
                page.locator(`xpath=//*[@*='${label}']`),
                page.locator(`xpath=//*[contains(@*, '${label}')]`),
                page.locator(`xpath=//label[contains(text(),'${label}')]/following::input[@type='text']`)
            ];

            let locator;
            try {
                locator = await mapLocatorsToPromises(preferredLocators, 'textContent');
                const content = await locator || '';

                if (regexFound) {
                    await expect(content).toMatch(new RegExp(resultString));
                } else {
                    await expect(content).toBe(resultString);
                }
                return;
            } catch (preferredError) {
                locator = await mapLocatorsToPromises(xpathLocators, 'textContent');
                const content = await locator || '';

                if (regexFound) {
                    await expect(content).toMatch(new RegExp(resultString));
                } else {
                    await expect(content).toBe(resultString);
                }
                return;
            }
        } catch (e) {
            throw e;
        }
    });
});

// Search if a is text in html code
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) By.css('Body'), CSS-Selektor (Body)
 */
Then('So I can see the text: {string}', async function(text) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const expectedText = applySpecialCommands(text.toString());
            const { resultString, regexFound } = resolveRegex(expectedText);

            /* const preferredLocators = [
                page.getByText(resultString, { exact: !regexFound }),
            ];

            if (regexFound) {
                await mapLocatorsToPromises(preferredLocators, 'toBeVisible');
            } else {
                await mapLocatorsToPromises(preferredLocators, 'toBeVisible');
            } */

            // Ersetze mehrere Whitespaces durch ein einzelnes Leerzeichen und trimme den String
            const normalizedExpectedText = expectedText.replace(/\s+/g, ' ').trim();

            const pageHTML = await page.content();
            if (regexFound) {
                expect(pageHTML).toMatch(new RegExp(normalizedExpectedText));
            } else {
                // Regulärer Ausdruck, um WHitespaces vorne und hinten zu ignorieren
                expect(pageHTML).toContain(normalizedExpectedText);
            }

        } catch (e) {
            throw Error(e);
        }
    });
});


// Search a textfield in the html code and assert if it's empty
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@id='${label}'], XPath (Element mit ID)
 * (X) //*[@*='${label}'], XPath (Element mit beliebigem Attribut)
 * (X) //*[contains(@id, '${label}')], XPath (Element mit enthaltender ID)
 * (X) ${label}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So I can\'t see text in the textbox: {string}', async function(label) {
    await handleError(async () => {
        try {
            const page = this.getPage();

            const preferredLocators = [
                page.getByRole('textbox', { name: label }),
                page.getByLabel(label),
                page.getByPlaceholder(label),
                page.locator(`#${label}`),
                page.locator(`[name="${label}"]`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[@id='${label}']`),
                page.locator(`xpath=//*[@*='${label}']`),
                page.locator(`xpath=//*[contains(@id, '${label}')]`),
                page.locator(`xpath=//*[@name='${label}']`),
                page.locator(`xpath=//*[contains(@name, '${label}')]`),
                page.locator(`xpath=//*[contains(text(), '${label}')]`)
            ];

            try {
                const locator = await mapLocatorsToPromises(preferredLocators, 'inputValue');
                await expect(await locator.inputValue()).toBe('');
            } catch (preferredError) {
                const locator = await mapLocatorsToPromises(xpathLocators, 'inputValue');
                await expect(await locator.inputValue()).toBe('');
            }
        } catch (e) {
            throw e;
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

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //picture[source[contains(@srcset, '${picture}')] or img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]], XPath (Picture mit Source oder Img mit src/alt/id/title)
 * (X) //img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')], XPath (Img mit src/alt/id/title)
 * (X) ${picture}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So the picture {string} has the name {string}', async function(picture, name) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const preferredLocators = [
                page.getByRole('img', { name: picture }),
                page.getByAltText(picture),
                page.locator(`img[src*="${picture}"]`),
                page.locator(`img[src*="${name}"]`),
                page.locator(`#${picture}`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//picture[source[contains(@srcset, '${picture}')] or img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]]`),
                page.locator(`xpath=//img[contains(@src, '${picture}') or contains(@alt, '${picture}') or @id='${picture}' or contains(@title, '${picture}')]`),
            ];

            try {
                const locator = await mapLocatorsToPromises(preferredLocators, 'isVisible');
                const src = await locator.getAttribute('src');
                if (src?.includes(name)) {
                    return;
                }
            } catch (preferredError) {
                const locator = await mapLocatorsToPromises(xpathLocators, 'isVisible');
                const src = await locator.getAttribute('src');
                if (src?.includes(name)) {
                    return;
                }
            }
        } catch (e) {
            throw e;
        }
    });
});

// Search if a text isn't in html code
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (x) By.css('Body'), CSS-Selektor (Body)
 */
Then('So I can\'t see the text: {string}', async function(text) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const expectedText = applySpecialCommands(text.toString());
            const { resultString, regexFound } = resolveRegex(expectedText);

            /* const preferredLocators = [
                page.getByText(resultString, { exact: !regexFound }),
            ];

            if (regexFound) {
                await mapLocatorsToPromises(preferredLocators, 'not.toHaveText', new RegExp(resultString));
            } else {
                await mapLocatorsToPromises(preferredLocators, 'not.toContainText', resultString);
            } */

            // Check in HTML content
            const pageHTML = await page.content();
            console.log(pageHTML);
            if (regexFound) {
                expect(pageHTML).not.toMatch(new RegExp(resultString));
            } else {
                expect(pageHTML).not.toContain(resultString);
            }

        } catch (e) {
            throw e;
        }
    });
});


// Check if a checkbox is set (true) or not (false)
/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[@type='checkbox' and @*='${checkboxName}'], XPath (Checkbox mit Attribut und dynamischem Wert)
 * (X) //*[contains(text(),'${checkboxName}')]//parent::label, XPath (Element mit enthaltenem Text, Elternteil Label)
 * (X) //*[contains(text(),'${checkboxName}') or @*='${checkboxName}'], XPath (Element mit enthaltenem Text oder Attribut mit dynamischem Wert)
 * (X) ${checkboxName}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So the checkbox {string} is set to {string} [true OR false]', async function(checkboxName, checkedString) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            const checked = checkedString.toLowerCase() === 'true'; // Konvertierung in Boolean

            const preferredLocators = [
                page.getByRole('checkbox', { name: checkboxName }),
                page.getByLabel(checkboxName),
                page.locator(`[type="checkbox"][name="${checkboxName}"]`),
                page.locator(`[type="checkbox"][id="${checkboxName}"]`),
                page.locator(`label:has-text("${checkboxName}") input[type="checkbox"]`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[@type='checkbox' and @*='${checkboxName}']`),
                page.locator(`xpath=//*[contains(text(),'${checkboxName}')]//parent::label`),
                page.locator(`xpath=//*[contains(text(),'${checkboxName}') or @*='${checkboxName}']`),
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'toBeChecked');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'toBeChecked');
            }
        } catch (e) {
            throw e;
        }
    });
});

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[contains(text(),'${element}')], XPath (Element mit enthaltendem Text)
 * (X) //*[@id='${element}'], XPath (Element mit ID)
 * (X) //*[@*='${element}'], XPath (Element mit beliebigem Attribut)
 * (X) //*[contains(@*, '${element}')], XPath (Element mit enthaltendem Attribut)
 * (X) //*[contains(@id, '${element}')], XPath (Element mit enthaltender ID)
 * (X) ${element}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So on element {string} the css property {string} is {string}', async function(element, property, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            const preferredLocators = [
                page.getByRole('generic', { name: element }),
                page.getByText(element, { exact: true }),
                page.getByLabel(element),
                page.locator(`#${element}`),
                page.locator(`[role="${element}"]`),
                page.locator(`[data-testid="${element}"]`),
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[contains(text(),'${element}')]`),
                page.locator(`xpath=//*[@id='${element}']`),
                page.locator(`xpath=//*[@*='${element}']`),
                page.locator(`xpath=//*[contains(@*, '${element}')]`),
                page.locator(`xpath=//*[contains(@id, '${element}')]`)
            ];

            try {
                const actual = await mapLocatorsToPromises(preferredLocators, 'evaluate', property);
                // Handle color values
                if (actual.startsWith('rgb')) {
                    const colorNumbers = actual.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
                    const [r, g, b] = colorNumbers.map(v => Number(v).toString(16).padStart(2, '0'));
                    const hex = `#${r}${g}${b}`;
                    await expect(value.toLowerCase()).toBe(hex.toLowerCase());
                    return;
                }

                await expect(actual).toBe(value);

            } catch (preferredError) {
                const actual = await mapLocatorsToPromises(xpathLocators, 'evaluate', property);
                // Handle color values
                if (actual.startsWith('rgb')) {
                    const colorNumbers = actual.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
                    const [r, g, b] = colorNumbers.map(v => Number(v).toString(16).padStart(2, '0'));
                    const hex = `#${r}${g}${b}`;
                    await expect(value.toLowerCase()).toBe(hex.toLowerCase());
                    return;
                }

                await expect(actual).toBe(value);

            }
        } catch (e) {
            throw e;
        }
    });
});

/*
 * Übersicht der bisherigen Selenium-Identifikatoren und ihrer Strategien:
 * (X) //*[contains(text(),'${element}')], XPath (Element mit enthaltendem Text)
 * (X) //*[@id='${element}'], XPath (Element mit ID)
 * (X) //*[@*='${element} and @role=tooltip], XPath (Element mit Attribut und Rolle)
 * (X) //*[contains(@*, '${element}')], XPath (Element mit enthaltendem Attribut)
 * (X) //*[@*='${element}'], XPath (Element mit beliebigem Attribut)
 * (X) //*[contains(@id, '${element}')], XPath (Element mit enthaltender ID)
 * (X) ${element}, Implizite Suche (ID oder Name, kontextabhängig)
 */
Then('So the element {string} has the tool-tip {string}', async function(element, value) {
    await handleError(async () => {
        try {
            const page = this.getPage();
            
            const preferredLocators = [
                page.getByRole('tooltip', { name: value }),
                page.getByLabel(value),
                page.getByText(element).filter({ has: page.locator('[role="tooltip"]') }),
                page.locator(`[title="${value}"]`),
                page.locator(`[aria-label="${value}"]`),
                page.locator(`[data-tooltip="${value}"]`),
                page.locator(`#${element}`)
            ];

            const xpathLocators = [
                page.locator(`xpath=//*[contains(text(),'${element}')]`),
                page.locator(`xpath=//*[@id='${element}']`),
                page.locator(`xpath=//*[@*='${element}' and @role='tooltip']`),
                page.locator(`xpath=//*[contains(@*, '${element}')]`),
                page.locator(`xpath=//*[@*='${element}']`),
                page.locator(`xpath=//*[contains(@id, '${element}')]`),
            ];

            try {
                await mapLocatorsToPromises(preferredLocators, 'toHaveAttribute', value=value, 'title', 'aria-label', 'data-tooltip');
            } catch (preferredError) {
                await mapLocatorsToPromises(xpathLocators, 'toHaveAttribute', value=value, 'title', 'aria-label', 'data-tooltip');
            }

        } catch (e) {
            throw e;
        }
    });
});

//TODO: Implement across application?
/* Then('So the cookie {string} has the value {string}', async function(name, expectedValue) {
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
}); */

