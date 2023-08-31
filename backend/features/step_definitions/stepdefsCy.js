const { Given, When, Then } = require("@badeball/cypress-cucumber-preprocessor");
const Cypress = require("cypress");

Given('I am on the website: {string}', function getUrl(url) {
	const world = this;
	try {
		cy.visit(url);
	} catch (e) {
		cy.screenshot().then(async (buffer) => {
			world.attach(buffer, 'image/png');
		});
		throw Error(e);
	}
});

Given('I take a screenshot. Optionally: Focus the page on the element {string}', async function takeScreenshot(element) {
	const world = this;
	await cy.document().should('exist');
	const identifiers = [`#${element}`, `[id*='${element}']`, `[id*='${element}']`, `${element}`];
	const promises = identifiers.map((idPath) => cy.get(idPath));

	await Cypress.Promise.any(promises)
		.then(async () => {
			await cy.screenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
		})
		.catch(async (e) => {
			await cy.screenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
});

// clicks a button if found in html code with xpath,
// timeouts if not found after 3 sec, afterwards selenium waits for next page to be loaded
When('I click the button: {string}', async function clickButton(button) {
	const world = this;
	const identifiers = [`//*[@id='${button}']`, `//*[contains(@id,'${button}')]`, `//*[text()='${button}' or @*='${button}']`, `//*[contains(text(),'${button}')]`, `${button}`];
	await cy.url()
		.then(async (currentUrl) => {
			// prevent Button click on "Run Story" or "Run Scenario" to prevent recursion
			if ((currentUrl === 'http://localhost:4200/' || currentUrl === 'https://seed-test-frontend.herokuapp.com/') && button.toLowerCase()
				.match(/^run[ _](story|scenario)$/) !== null) throw new Error('Executing Seed-Test inside a scenario is not allowed, to prevent recursion!');
		});
	
	const promises = identifiers.map((idPath) => cy.get(idPath));
	return Cypress.Promise.any(promises)
		.then((elem) => {
			elem.click();
		})
		.catch(async (e) => {
			await cy.screenshot().then(async (buffer) => {
				world.attach(buffer, 'image/png');
			});
			throw Error(e);
		});
});


Given("I am on the Bing homepage", () => {
  cy.visit("https://www.bing.com");
});

When("I search for {string}", (query) => {
  cy.get("#sb_form_q").type(query).type("{enter}");
});

Then("I should see results for {string}", (query) => {
  cy.get("#b_content").should("contain", query);
});
