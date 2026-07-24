// Selenium World uses dynamic properties (this.driver, this.downloadDir, etc.)
// that bypass TypeScript's type system — keep require() until the class is properly typed
const { World } = require('@cucumber/cucumber');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');
const fs = require('node:fs');
const os = require('node:os');

class SeleniumWebdriverWorld extends World {
	constructor(options: any) {
		super(options);

		// Explizit die attach-Methode von Cucumber-World übernehmen
		this.attach = options.attach;

		// Verzeichnisse basierend auf Betriebssystem festlegen
		switch (os.platform()) {
			case 'win32':
				this.downloadDir = 'C:\\Users\\Public\\seed_Downloads\\';
				this.tmpUploadDir = 'C:\\Users\\Public\\SeedTmp\\';
				break;
			case 'darwin':
				this.downloadDir = `/Users/${os.userInfo().username}/Downloads/`;
				this.tmpUploadDir = `/Users/${os.userInfo().username}/SeedTmp/`;
				break;
			default:
				this.downloadDir = '/home/public/Downloads/';
				this.tmpUploadDir = '/home/public/SeedTmp/';
		}

		this.createDirectories();

		// Parameter aus den Options übernehmen
		this.parameterCollection = options.parameters;
		this.scenarioCount = 0;
		this.testParameters = {
			browser: 'chrome',
			waitTime: 0,
			windowSize: {
				width: 1920,
				height: 1080
			},
			headless: false,
			daisyAutoLogout: false,
			oneDriver: false
		};

		// Testparameter mit Werten aus den Szenario überschreiben
		if (
			this.parameterCollection.scenarios &&
      this.parameterCollection.scenarios.length > 0
		) 
			this.testParameters = {
				...this.testParameters,
				...this.parameterCollection.scenarios[this.scenarioCount]
			};
    

		this.driver = null;
		this.searchTimeout = 15000;
	}

	// Shared Instance für oneDriver
	static sharedInstances: { driver: any } = {
		driver: null
	};

	createDirectories() {
		[this.downloadDir, this.tmpUploadDir].forEach((dir) => {
			if (!fs.existsSync(dir)) 
				fs.mkdirSync(dir, { recursive: true });
      
		});
	}

	getBrowserOptions() {
		// Chrome-Optionen (--start-maximized removed — applied conditionally after build)
		const chromeOptions = new chrome.Options()
			.setUserPreferences({ 'download.default_directory': this.downloadDir })
			.addArguments('--disable-dev-shm-usage')
			.addArguments('--ignore-certificate-errors')
			.addArguments('--lang=de')
			.addArguments('--excludeSwitches=enable-logging');

		// Firefox-Optionen
		const firefoxOptions = new firefox.Options()
			.setPreference('browser.download.dir', this.downloadDir)
			.setPreference('browser.download.folderList', 2)
			.setPreference(
				'browser.helperApps.neverAsk.saveToDisk',
				'application/octet-stream'
			)
			.addArguments('--no-sandbox')
			.setBrowserVersion('stable');

		// Edge-Optionen (--start-maximized removed — applied conditionally after build)
		const edgeOptions = new edge.Options()
			.setUserPreferences({ 'download.default_directory': this.downloadDir })
			.addArguments('--disable-dev-shm-usage')
			.addArguments('--ignore-certificate-errors')
			.addArguments('--lang=de')
			.addArguments('--excludeSwitches=enable-logging');

		// Headless-Modus aktivieren, wenn nicht Windows
		if (!os.platform().includes('win32') && this.testParameters.headless) {
			chromeOptions.addArguments('--headless');
			chromeOptions.addArguments('--no-sandbox');
			firefoxOptions.addArguments('--headless');
			edgeOptions.addArguments('--headless');
			edgeOptions.addArguments('--no-sandbox');
		}

		// Emulator-Konfiguration
		if (this.testParameters.emulator) 
			switch (this.testParameters.browser) {
				case 'chrome':
					chromeOptions.setMobileEmulation({
						deviceName: this.testParameters.emulator
					});
					break;
				case 'MicrosoftEdge':
					edgeOptions.setMobileEmulation({
						deviceName: this.testParameters.emulator
					});
					break;
			}
    
		// Fenstergröße konfigurieren
		else if (this.testParameters.windowSize) 
			switch (this.testParameters.browser) {
				case 'chrome':
					chromeOptions.windowSize(this.testParameters.windowSize);
					break;
				case 'MicrosoftEdge':
					edgeOptions.windowSize(this.testParameters.windowSize);
					break;
				case 'firefox':
					firefoxOptions.windowSize(this.testParameters.windowSize);
					break;
			}
    

		return { chromeOptions, firefoxOptions, edgeOptions };
	}

	async launchBrowser() {
		console.log('Launching browser with config: ', this.testParameters);

		try {
			// OneDriver-Modus: Existierenden Browser wiederverwenden
			if (
				this.testParameters.oneDriver &&
        SeleniumWebdriverWorld.sharedInstances.driver
			) 
			// Prüfen, ob die Sitzung noch gültig ist
				try {
					// Einfache Aktion, um Sitzungsgültigkeit zu prüfen
					await SeleniumWebdriverWorld.sharedInstances.driver.getTitle();
					console.log('Reusing existing browser session (oneDriver active)');
					this.driver = SeleniumWebdriverWorld.sharedInstances.driver;
					return;
				} catch (sessionError: unknown) {
					console.log('Stored session is invalid, creating new one:', sessionError instanceof Error ? sessionError.message : String(sessionError));
					SeleniumWebdriverWorld.sharedInstances.driver = null;
				}
    

			// Nur wenn oneDriver nicht aktiv ist, vorherigen Browser schließen - vermutlich redundant, aber zur Sicherheit
			if (!this.testParameters.oneDriver && this.driver) {
				console.log('Closing previous browser session (oneDriver not active)');
				await this.driver.quit();
				this.driver = null;
			}

			// Neuen Browser nur starten, wenn noch keiner existiert
			if (!this.driver) {
				console.log('Starting new browser session');
				// Map Playwright browser names to Selenium equivalents before building options
				if (this.testParameters.browser == 'chromium' || this.testParameters.browser == 'webkit')
					this.testParameters.browser = 'chrome';

				// Browser-Optionen holen (must happen after browser name mapping)
				const { chromeOptions, firefoxOptions, edgeOptions } =
					this.getBrowserOptions();

				// Neuen Browser starten
				const builder = new webdriver.Builder().forBrowser(
					this.testParameters.browser
				);

				// Browser-spezifische Optionen setzen
				switch (this.testParameters.browser) {
					case 'chrome':
						builder.setChromeOptions(chromeOptions);
						break;
					case 'firefox':
						builder.setFirefoxOptions(firefoxOptions);
						break;
					case 'MicrosoftEdge':
						builder.setEdgeOptions(edgeOptions);
						break;
				}

				// Browser starten
				this.driver = await builder.build();

				// Timeouts konfigurieren
				await this.driver.manage().setTimeouts({
					implicit: 1000,
					pageLoad: 30000,
					script: 15000
				});

				// Fenster nur maximieren wenn kein custom window size und kein emulator konfiguriert ist
				if (!this.testParameters.windowSize && !this.testParameters.emulator) 
					await this.driver.manage().window().maximize();
        

				// Für oneDriver den Browser speichern
				if (this.testParameters.oneDriver) 
					SeleniumWebdriverWorld.sharedInstances.driver = this.driver;
        

				console.log('Browser launched successfully:', this.testParameters.browser);
			}
		} catch (error: unknown) {
			console.error('Browser launch failed:', error);
			throw new Error(`Browser setup failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async closeBrowser() {
		if (
			this.testParameters.oneDriver &&
      this.scenarioCount < this.parameterCollection.scenarios.length - 1
		) {
			console.log(
				'Keeping browser session for next scenario (oneDriver active)'
			);
			return;
		}

		if (this.driver) {
			console.log('Closing browser session');
			await this.driver.quit();
			this.driver = null;

			// Shared Instance zurücksetzen
			if (!this.testParameters.oneDriver) 
				SeleniumWebdriverWorld.sharedInstances.driver = null;
      
		}
	}

	getDriver() {
		if (!this.driver) 
			throw new Error('WebDriver not initialized');
    
		return this.driver;
	}

	async setScenarioCount(count: number) {
		console.log('Setting scenarioCount to:', count);
		this.scenarioCount = count;

		this.testParameters = {
			...this.testParameters,
			...this.parameterCollection.scenarios[count]
		};

		// Bei oneDriver den Browser des ersten Szenarios für alle verwenden
		if (this.testParameters.oneDriver && count > 0) 
			this.testParameters.browser = this.parameterCollection.scenarios[0].browser;
    

		//Nur Browser schließen, wenn oneDriver nicht aktiv
		if (this.driver && !this.testParameters.oneDriver) {
			await this.closeBrowser();
			this.driver = null;
		};
	}

	async takeScreenshot() {
		if (!this.driver) {
			console.error('Screenshot failed: Driver not initialized');
			return null;
		}
		try {
			const buffer = await this.driver.takeScreenshot();
			return Buffer.from(buffer, 'base64');
		} catch (error) {
			console.error('Screenshot failed:', error);
			return null;
		}
	}
}

export { SeleniumWebdriverWorld };
