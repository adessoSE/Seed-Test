import { IWorldOptions, World, setDefaultTimeout } from '@cucumber/cucumber';
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

interface StoryParameters {
    scenarios: TestParameters[];
}

class PlaywrightWorld extends World {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private readonly defaultTimeout = 30000;
    private parameterCollection: StoryParameters;
    private testParameters: TestParameters;
    private scenarioCount: number;
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
    
    constructor(options: IWorldOptions) {
        super(options);
        // Select with first scenario (incremented by incrementScenario())
        this.parameterCollection = options.parameters as StoryParameters;
        this.testParameters = {
            ...this.defaultSettings,
            ...this.parameterCollection.scenarios[this.scenarioCount]
        } as TestParameters;
        // Set default Cucumber timeout
        setDefaultTimeout(this.defaultTimeout); 
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

        if (!isWindows || this.testParameters.headless) {
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
                console.log('Reusing existing browser session (oneDriver active)');
                return;
            } else {
                const browserType = this.getBrowserType();
                const browserConfig = this.getBrowserConfig(parameters.browser);

                // Emulator-Konfiguration
                if (parameters.emulator) {
                    const devices = require('playwright').devices;
                    const device = devices[parameters.emulator];
                    if (device) {
                        try {
                            this.browser = await browserType.launch(browserConfig);
                        } catch (error) {
                            throw new Error(`Browser launch failed in Emulator: ${error.message}`);
                        }
                        try {
                            this.context = await this.browser.newContext({
                            ...device,
                            acceptDownloads: true,
                            locale: 'de-DE'
                        });
                        } catch (error) {
                            throw new Error(`Context creation failed in emulator: ${error.message}`);
                        }
                    }
                } else {
                    try {
                        this.browser = await browserType.launch(browserConfig);
                    } catch (error) {
                        throw new Error(`Browser launch failed: ${error.message}`);
                    };
            
                    try {
                        this.context = await this.browser.newContext({
                            viewport: parameters.windowSize,
                            acceptDownloads: true
                        });
                    } catch (error) {
                        throw new Error(`Context creation failed: ${error.message}`);
                    };
                }
            }

            try {
                this.page = await this.context.newPage();
            } catch (error) {
                throw new Error(`Page creation failed: ${error.message}`);
            }
            
            if (parameters.waitTime > 0) {
                this.page.setDefaultTimeout(parameters.waitTime);
            }
        } catch (error) {
            await this.closeBrowser();
            throw new Error(`Browser setup failed: ${error.message}`);
        }
    }

    private getBrowserType() {
        switch(this.testParameters.browser) {
            case 'firefox': return firefox;
            case 'webkit': return webkit;
            default: return chromium;
        }
    }

    async closeBrowser(): Promise<void> {
        console.log('Closing browser...');
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

    setScenarioCount(count: number) {
        this.scenarioCount = count;
    }
}


export { PlaywrightWorld };
