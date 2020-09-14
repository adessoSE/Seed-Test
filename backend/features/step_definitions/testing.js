const webdriver = require('selenium-webdriver');
const { By, until, Key } = require('selenium-webdriver');
require('geckodriver');
const chrome = require('selenium-webdriver/chrome');

async function test(driver) {
    driver.get('https://seed-test-frontend.herokuapp.com/login');
    await hover("Help", "Tutorial (german)");
    await hover("Help", "Tutorial (english)");
    await hover("Help", "Tutorial (german)");
    const originalWindow = await driver.getWindowHandle();
    console.log("original window: " + originalWindow);
    await tab(1);

    // await text("Die benötigten Daten für den Loginvorgang");
    // await text("There are two different login credentials needed")
    await text("No account? Register here.")

    // number_of_tabs = 1 --> "latest / newest tab"
    // number_of_tabs = 0 --> "initial tab"
    // number_of_tabs = 2 --> "second-last tab"
    // number_of_tabs = 2 --> "third-last tab"

//     driver.get('https://etu.daisy.bva.bund.de/');
//     driver.findElement(By.css(`input#${"anwendername"}`)).clear();
//     driver.findElement(By.css(`input#${"anwendername"}`)).sendKeys("");
//     driver.findElement(By.css(`input#${"passw"}`)).clear();
//     driver.findElement(By.css(`input#${"passw"}`)).sendKeys("");
//     driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + "='"}${"anmelden"}' or ` + `${'@*' + "='"}${"anmelden"}']`)), 3 * 1000).click();
//     driver.sleep(parseInt("3000"));
//
//     let button = "DSDANWENDUNG"
//     driver.wait(until.elementLocated(By.xpath(`${'//*[text()' + "='"}${button}' or ` + `${'@*' + "='"}${button}']`)), 3 * 1000).click();
//     driver.get('https://etu.daisy.bva.bund.de/dsd/app/pruefungsschulenAktivierenFlow');
//     // driver.wait(async () => driver.executeScript('return document.readyState').then(async readyState => readyState === 'complete'));
//     driver.sleep(parseInt("3000"));
//     let dropd = "inhaltsbereichForm:j_idt286:j_idt337:pruefungsschuleSuchkriterien-schultyp_selectDropdown"
//     let value = "DAS";
//     let dropdwn = driver.wait(until.elementLocated(By.id(dropd)));
//     console.log(dropdwn);
//     driver.wait(until.elementLocated(By.xpath(`//*[@id='${dropd}']/option[text()='${value}']`)), 3 * 1000).click();
}

async function tab(number_of_tabs){
    const chrome_tabs = await driver.getAllWindowHandles();
    const len = chrome_tabs.length;
    console.log("number of windows: " + len);
    // for (let tab in chrome_tabs){
    //     await driver.switchTo().window(chrome_tabs[tab]);
    //     const new_tab = await driver.getWindowHandle();
    //     console.log("tab nr.: " + tab + " name: " + new_tab)
    // }
    if (number_of_tabs === 1){
        console.log("switchTo: 1st tab");
        await driver.switchTo().window(chrome_tabs[0]);
    } else {
        const tab = len - (number_of_tabs -1);
        console.log("switchTo: " + tab);
        await driver.switchTo().window(chrome_tabs[tab]);
    }
}

async function hover(element, option) {
    const action = driver.actions({bridge: true});
    const link = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${element}')]`)), 3 * 1000);
    await action.move({x: 0, y: 0, origin: link}).perform();

    await driver.sleep(2000);
    const action2 = driver.actions({bridge: true}); // second action needed?
    try {
        const selection = await driver.findElement(By.xpath(`//*[contains(text(),'${element}')]/following::*[text()='${option}']`));
        await action2.move({origin: selection}).click().perform();

    } catch (e) {
        const selection = await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(),'${option}')]`)), 3 * 1000);
        await action2.move({origin: selection}).click().perform();
    }
}

async function text(string){
    await driver.wait(until.elementLocated(By.css('Body')), 3 * 1000).then(async (body) => {
        const text = await body.getText().then(bodytext => bodytext);
        if (text.includes(string)){
            console.log("Text found")
        } else {
            console.log("text not found")
        }
    });
}

// let driver;
// const chromeOptions = new chrome.Options();
// // chromeOptions.addArguments('--headless');
// chromeOptions.addArguments('--ignore-certificate-errors');
// chromeOptions.bynary_location = process.env.GOOGLE_CHROME_SHIM;
// // chromeOptions.addArguments("w3c", false); //this is the relevant line that hopefully will solve the problem
//
// driver = new webdriver.Builder()
//     .forBrowser('chrome')
//     .setChromeOptions(chromeOptions)
//     .build();
// test(driver);
