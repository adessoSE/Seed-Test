const { World } = require("@cucumber/cucumber");
const webdriver = require("selenium-webdriver");
const { By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const edge = require("selenium-webdriver/edge");
const fs = require("fs");
const os = require("os");
const path = require("path");

class SeleniumWebdriverWorld extends World {
  constructor(options) {
    super(options);

    // Explizit die attach-Methode von Cucumber-World übernehmen
    this.attach = options.attach;

    // Verzeichnisse basierend auf Betriebssystem festlegen
    switch (os.platform()) {
      case "win32":
        this.downloadDir = "C:\\Users\\Public\\seed_Downloads\\";
        this.tmpUploadDir = "C:\\Users\\Public\\SeedTmp\\";
        break;
      case "darwin":
        this.downloadDir = `/Users/${os.userInfo().username}/Downloads/`;
        this.tmpUploadDir = `/Users/${os.userInfo().username}/SeedTmp/`;
        break;
      default:
        this.downloadDir = "/home/public/Downloads/";
        this.tmpUploadDir = "/home/public/SeedTmp/";
    }

    this.createDirectories();

    // Parameter aus den Options übernehmen
    this.parameterCollection = options.parameters;
    this.scenarioCount = 0;
    this.testParameters = {
      browser: "chrome",
      waitTime: 0,
      windowSize: {
        width: 1920,
        height: 1080,
      },
      headless: false,
      daisyAutoLogout: false,
      oneDriver: false,
    };

    // Testparameter mit Werten aus den Szenario überschreiben
    if (
      this.parameterCollection.scenarios &&
      this.parameterCollection.scenarios.length > 0
    ) {
      this.testParameters = {
        ...this.testParameters,
        ...this.parameterCollection.scenarios[this.scenarioCount],
      };
    }

    this.driver = null;
    this.searchTimeout = 15000;
  }

  // Shared Instance für oneDriver
  static sharedInstances = {
    driver: null,
  };

  createDirectories() {
    [this.downloadDir, this.tmpUploadDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  getBrowserOptions() {
    // Chrome-Optionen
    const chromeOptions = new chrome.Options()
      .setUserPreferences({ "download.default_directory": this.downloadDir })
      .addArguments("--disable-dev-shm-usage")
      .addArguments("--ignore-certificate-errors")
      .addArguments("--start-maximized")
      .addArguments("--lang=de")
      .addArguments("--excludeSwitches=enable-logging");

    // Firefox-Optionen
    const firefoxOptions = new firefox.Options()
      .setPreference("browser.download.dir", this.downloadDir)
      .setPreference("browser.download.folderList", 2)
      .setPreference(
        "browser.helperApps.neverAsk.saveToDisk",
        "application/octet-stream"
      )
      .addArguments("--no-sandbox")
      .setBrowserVersion("stable");

    // Edge-Optionen
    const edgeOptions = new edge.Options()
      .setUserPreferences({ "download.default_directory": this.downloadDir })
      .addArguments("--disable-dev-shm-usage")
      .addArguments("--ignore-certificate-errors")
      .addArguments("--start-maximized")
      .addArguments("--lang=de")
      .addArguments("--excludeSwitches=enable-logging");

    // Headless-Modus aktivieren, wenn nicht Windows
    if (!os.platform().includes("win32") && this.testParameters.headless) {
      chromeOptions.addArguments("--headless");
      chromeOptions.addArguments("--no-sandbox");
      firefoxOptions.addArguments("--headless");
      edgeOptions.addArguments("--headless");
      edgeOptions.addArguments("--no-sandbox");
    }

    // Emulator-Konfiguration
    if (this.testParameters.emulator) {
      switch (this.testParameters.browser) {
        case "chrome":
          chromeOptions.setMobileEmulation({
            deviceName: this.testParameters.emulator,
          });
          break;
        case "MicrosoftEdge":
          edgeOptions.setMobileEmulation({
            deviceName: this.testParameters.emulator,
          });
          break;
      }
    }
    // Fenstergröße konfigurieren
    else if (this.testParameters.windowSize) {
      switch (this.testParameters.browser) {
        case "chrome":
          chromeOptions.windowSize(this.testParameters.windowSize);
          break;
        case "MicrosoftEdge":
          edgeOptions.windowSize(this.testParameters.windowSize);
          break;
        case "firefox":
          firefoxOptions.windowSize(this.testParameters.windowSize);
          break;
      }
    }

    return { chromeOptions, firefoxOptions, edgeOptions };
  }

  async launchBrowser() {
    console.log("Launching browser with config: ", this.testParameters);

    try {
      // OneDriver-Modus: Existierenden Browser wiederverwenden
      if (
        this.testParameters.oneDriver &&
        SeleniumWebdriverWorld.sharedInstances.driver
      ) {
        this.driver = SeleniumWebdriverWorld.sharedInstances.driver;
        console.log("Reusing existing browser session (oneDriver active)");
        return;
      }

      // Nur wenn oneDriver nicht aktiv ist, vorherigen Browser schließen - vermutlich redundant, aber zur Sicherheit
      if (!this.testParameters.oneDriver && this.driver) {
        console.log("Closing previous browser session (oneDriver not active)");
        await this.driver.quit();
        this.driver = null;
      }

      // Neuen Browser nur starten, wenn noch keiner existiert
      if (!this.driver) {
        console.log("Starting new browser session");
        // Browser-Optionen holen
        const { chromeOptions, firefoxOptions, edgeOptions } =
          this.getBrowserOptions();

        if (this.testParameters.browser == "chromium")
          this.testParameters.browser = "chrome";

        // Neuen Browser starten
        const builder = new webdriver.Builder().forBrowser(
          this.testParameters.browser
        );

        // Browser-spezifische Optionen setzen
        switch (this.testParameters.browser) {
          case "chrome":
            builder.setChromeOptions(chromeOptions);
            break;
          case "firefox":
            builder.setFirefoxOptions(firefoxOptions);
            break;
          case "MicrosoftEdge":
            builder.setEdgeOptions(edgeOptions);
            break;
        }

        // Browser starten
        this.driver = await builder.build();

        // Timeouts konfigurieren
        await this.driver.manage().setTimeouts({
          implicit: 1000,
          pageLoad: 30000,
          script: 15000,
        });

        // Fenster maximieren
        await this.driver.manage().window().maximize();

        // Für oneDriver den Browser speichern
        if (this.testParameters.oneDriver) {
          SeleniumWebdriverWorld.sharedInstances.driver = this.driver;
        }

        console.log(
          "Browser should be:",
          this.testParameters.browser,
          " Driver should be:",
          this.testParameters.testRunner
        );
        console.log("Browser launched successfully");
      }
    } catch (error) {
      console.error("Browser launch failed:", error);
      throw new Error(`Browser setup failed: ${error.message}`);
    }
  }

  async closeBrowser() {
    if (
      this.testParameters.oneDriver &&
      this.scenarioCount < this.parameterCollection.scenarios.length - 1
    ) {
      console.log(
        "Keeping browser session for next scenario (oneDriver active)"
      );
      return;
    }

    if (this.driver) {
      console.log("Closing browser session");
      await this.driver.quit();
      this.driver = null;

      // Shared Instance zurücksetzen
      if (!this.testParameters.oneDriver) {
        SeleniumWebdriverWorld.sharedInstances.driver = null;
      }
    }
  }

  getDriver() {
    if (!this.driver) {
      throw new Error("WebDriver not initialized");
    }
    return this.driver;
  }

  setScenarioCount(count) {
    console.log("Setting scenarioCount to:", count);
    this.scenarioCount = count;

    if (this.driver && !this.testParameters.oneDriver) {
      this.closeBrowser();
      this.driver = null;
    }

    this.testParameters = {
      ...this.testParameters,
      ...this.parameterCollection.scenarios[count],
    };
  }

  async takeScreenshot() {
    if (!this.driver) {
      console.error("Screenshot failed: Driver not initialized");
      return null;
    }
    try {
      const buffer = await this.driver.takeScreenshot();
      return Buffer.from(buffer, "base64");
    } catch (error) {
      console.error("Screenshot failed:", error);
      return null;
    }
  }
}

module.exports = { SeleniumWebdriverWorld };
