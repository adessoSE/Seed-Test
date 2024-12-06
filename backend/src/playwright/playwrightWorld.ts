import { Before, After, setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Typdefinitionen
interface TestParameters {
    browser: 'chromium' | 'firefox' | 'webkit' | 'MicrosoftEdge';
    waitTime: number;
    windowSize: {
        width: number;
        height: number;
    };
    headless: boolean;
    daisyAutoLogout: boolean;
    emulator?: string;
    oneDriver: boolean;
}

class PlaywrightWorld {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private parameters: TestParameters;
    private testStatus: 'PASSED' | 'FAILED' = 'PASSED';
    private scenarioCount: number = 0;
    private totalScenarios: number;
    private readonly downloadDir: string;
    private readonly tmpUploadDir: string;
    //private readonly videoDir: string;

    private readonly defaultSettings: TestParameters = {
        browser: 'chromium',
        waitTime: 0,
        windowSize: {
            width: 1920,
            height: 1080
        },
        headless: false,
        daisyAutoLogout: false,
        oneDriver: false
    };

    constructor(settings?: Partial<TestParameters>) {
        this.parameters = { ...this.defaultSettings, ...settings };
        this.totalScenarios = this.parameters.scenarios.length;
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
        //this.videoDir = path.resolve(__dirname, 'videos');

        this.createDirectories();
    }

    private createDirectories(): void {
        [this.downloadDir, this.tmpUploadDir, /*this.videoDir*/].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    private getBrowserConfig(browserType: string) {
        const isWindows = os.platform().includes('win32');
        const commonArgs = [
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors',
            '--start-maximized',
            '--lang=de',
            '--excludeSwitches=enable-logging'
        ];

        if (!isWindows) {
            commonArgs.push('--headless', '--no-sandbox');
        }

        return {
            args: commonArgs,
            downloadPath: this.downloadDir,
            channel: browserType === 'MicrosoftEdge' ? 'msedge' : undefined
        };
    }

    async launchBrowser(parameters: TestParameters): Promise<void> {
        try {
            // Wenn oneDriver aktiv ist und bereits ein Browser existiert
            if (parameters.oneDriver && this.browser) {
                //Keinen neuen Context oder Page setzen
            } else {
                const browserType = this.getBrowserType();
                const browserConfig = this.getBrowserConfig(parameters.browser);

                // Emulator-Konfiguration
                if (parameters.emulator) {
                    const devices = require('playwright').devices;
                    const device = devices[parameters.emulator];
                    if (device) {
                        this.browser = await browserType.launch(browserConfig);
                        this.context = await this.browser.newContext({
                            ...device,
                            acceptDownloads: true,
                            locale: 'de-DE'
                        });
                    }
                } else {
                    this.browser = await browserType.launch(browserConfig);
                    this.context = await this.browser.newContext({
                        viewport: parameters.windowSize,
                        acceptDownloads: true
                    });
                }
            }

            this.page = await this.context.newPage();
            
            if (parameters.waitTime > 0) {
                this.page.setDefaultTimeout(parameters.waitTime);
            }
        } catch (error) {
            throw new Error(`Failed to launch browser: ${error}`);
        }
    }

    private getBrowserType() {
        switch(this.parameters.browser) {
            case 'firefox': return firefox;
            case 'webkit': return webkit;
            default: return chromium;
        }
    }

    async closeBrowser(): Promise<void> {
        await this.page?.close();
        await this.context?.close();
        await this.browser?.close();
    }

    getPage(): Page {
        if (!this.page) {
            throw new Error('Page not initialized');
        }
        return this.page;
    }

    setTestStatus(status: 'PASSED' | 'FAILED') {
        this.testStatus = status;
    }

    getTestStatus() {
        return this.testStatus;
    }

    incrementScenarioCount() {
        this.scenarioCount++;
    }
}

// World Setup
setWorldConstructor(PlaywrightWorld);
setDefaultTimeout(30000);

// Hooks
Before(async function() {
    const currentScenarioIndex = this.parameters.scenarios.indexOf(this.currentScenario);

    console.log(`Starting Scenario with Index: ${currentScenarioIndex}`);
    await this.launchBrowser(this.parameters);
});

After(async function() {
    console.log(`Finished Scenario ${this.scenarioCount + 1}/${this.totalScenarios}`);
    
    if (this.testStatus === 'FAILED') {
        const timestamp = Date.now();
        const screenshotPath = path.join(this.downloadDir, `failed-${timestamp}.png`);
        await this.getPage().screenshot({ path: screenshotPath });
        console.log(`Screenshot saved: ${screenshotPath}`);
    }

    if (!this.parameters.oneDriver || this.isLastScenario()) {
        await this.closeBrowser();
        console.log('Browser closed - Last scenario or no one Session execution');
    } else {
        console.log('Browser kept open - More scenarios pending');
    }
    
    this.incrementScenarioCount();
});


export { PlaywrightWorld };
