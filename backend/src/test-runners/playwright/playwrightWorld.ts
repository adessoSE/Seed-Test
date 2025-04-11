import { IWorldOptions, World } from '@cucumber/cucumber';
import { Browser, BrowserContext, Download, Page, chromium, firefox, webkit } from '@playwright/test';
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

interface StoryParameters extends Array<TestParameters> {
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
    private lastDownload: Download | null = null;  // Neue Property für Downloads

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
        console.log('Initializing PlaywrightWorld with options:', {
            scenario0: options.parameters.scenarios[0],
            parameters: options.parameters,
            scenarioCount: this.scenarioCount
        });
        
        // Select with first scenario (incremented by incrementScenario())
        this.parameterCollection = options.parameters as StoryParameters;
        console.log(this.parameterCollection.scenarios[this.scenarioCount]);
        this.testParameters = {
            ...this.defaultSettings,
            ...this.parameterCollection.scenarios[this.scenarioCount]
        } as TestParameters;

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

    private static sharedInstances: {
        browser: Browser | null;
        context: BrowserContext | null;
        page: Page | null;
    } = {
        browser: null,
        context: null,
        page: null
    };

    private createDirectories(): void {
        [this.downloadDir, this.tmpUploadDir, /*this.videoDir*/].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    private getBrowserConfig(browserType: string) {
        console.log(browserType, " is in getBrowserConfig!");
        return {
            launchTimeout: this.defaultTimeout,
            headless: this.testParameters.headless ?? false,
            args: [
                '--disable-dev-shm-usage',
                '--ignore-certificate-errors',
                '--start-maximized',
                '--lang=de',
                '--excludeSwitches=enable-logging'
            ],
            downloadPath: this.downloadDir,
            channel: browserType === 'MicrosoftEdge' ? 'msedge' : undefined
        };
    }

    async launchBrowser(parameters: TestParameters): Promise<void> {
        console.log('Attempting to launch browser with config:', parameters);
        try {
            // Wenn oneDriver aktiv ist und bereits ein Browser existiert
            if (parameters.oneDriver && this.scenarioCount > 0) {
                    this.browser = PlaywrightWorld.sharedInstances.browser;
                    this.context = PlaywrightWorld.sharedInstances.context;
                    this.page = PlaywrightWorld.sharedInstances.page;
                    console.log('Reusing existing browser session (oneDriver active)');
                    return;
            } else {
                const browserType = this.getBrowserType();
                console.log(`Launching ${parameters.browser} ${String(browserType)} browser...`);
                const browserConfig = this.getBrowserConfig(parameters.browser);

                // Emulator-Konfiguration
                if (parameters.emulator) {
                    const devices = require('playwright').devices;
                    const device = devices[parameters.emulator];
                    if (device) {
                        try {
                            // Neuen Browser nur starten wenn noch keiner existiert
                            if (!this.browser) {
                                this.browser = await browserType.launch({...browserConfig, timeout: 10000});
                            }
                        } catch (error) {
                            throw new Error(`Browser launch failed in Emulator: ${error.message}`);
                        }
                        try {
                            // Neuen Context nur erstellen wenn sie nicht existieren
                            if (!this.context) {
                               this.context = await this.browser.newContext({
                                ...device,
                                acceptDownloads: true,
                                locale: 'de-DE'
                                });
                                // Set context-level timeouts after creation
                                this.context.setDefaultTimeout(5000);
                                this.context.setDefaultNavigationTimeout(10000);
                            };
                        } catch (error) {
                            throw new Error(`Context creation failed in emulator: ${error.message}`);
                        }
                    }
                } else {
                    try {
                        // Neuen Browser nur starten wenn noch keiner existiert
                        if (!this.browser) {
                            this.browser = await browserType.launch({...browserConfig, timeout: 10000});
                            console.log('Browser launched successfully');
                        }
                    } catch (error) {
                        throw new Error(`Browser launch failed: ${error.message}`);
                    };
            
                    try {
                        // Neuen Context nur erstellen wenn sie nicht existieren
                        if (!this.context) {
                            this.context = await this.browser.newContext({
                                viewport: parameters.windowSize,
                                acceptDownloads: true
                            });
                            // Set context-level timeouts after creation
                            this.context.setDefaultTimeout(5000);
                            this.context.setDefaultNavigationTimeout(10000);
                            console.log('Browser context created');
                        };
                    } catch (error) {
                        throw new Error(`Context creation failed: ${error.message}`);
                    };
                }
            }

            try {
                // Neuen Page nur erstellen wenn sie nicht existieren
                if (!this.page){
                    this.page = await this.context.newPage();
                    // Set page-level timeouts
                    this.page.setDefaultTimeout(5000);  // Actions Timeout
                    this.page.setDefaultNavigationTimeout(10000);  // Navigation Timeout
                    console.log('New page created');
                }
                //Globale Referenzen für OneDriver speichern
                if (parameters.oneDriver) {
                    PlaywrightWorld.sharedInstances.browser = this.browser;
                    PlaywrightWorld.sharedInstances.context = this.context;
                    PlaywrightWorld.sharedInstances.page = this.page;
                }
            } catch (error) {
                throw new Error(`Page creation failed: ${error.message}`);
            }
            
            
        } catch (error) {
            console.error('Detailed browser launch error: \n', error);
            await this.closeBrowser();
            throw new Error(`Browser setup failed: ${error.message}`);
        }
    }

    private getBrowserType() {
        console.log('Browser selection:', this.testParameters.browser);
        switch(this.testParameters.browser) {
            case 'firefox': 
                console.log('Selected Firefox browser engine');
                return firefox;
            case 'webkit': 
                console.log('Selected Webkit browser engine');
                return webkit; 
            default: 
                console.log(`Selected Chromium-based (${this.testParameters.browser}) browser engine`);
                return chromium;
        }
    }

    async closeBrowser(): Promise<void> {
        if (this.testParameters.oneDriver) {
            // Bei oneDriver nur beim letzten Szenario alles schließen
            console.log('Last scenario finished - closing browser session');
            await this.page?.close();
            await this.context?.close();
            await this.browser?.close();
            PlaywrightWorld.sharedInstances = {
                browser: null,
                context: null,
                page: null
            };
        } else {
            // Ohne oneDriver immer alles schließen
            console.log('Closing browser session');
            await this.page?.close();
            await this.context?.close();
            await this.browser?.close();
            console.log('Browser session closed');
        }
    }

    getPage(): Page {
        if (!this.page) {
            throw new Error('Page not initialized');
        }
        return this.page;
    }

    setScenarioCount(count: number) {
        console.log('Setting scenarioCOunt to: ', count)
        this.scenarioCount = count;
        this.testParameters = {
            ...this.defaultSettings,
            ...this.parameterCollection.scenarios[count]
        } as TestParameters;
    }

    getLastDownload(): Download | null {
        return this.lastDownload;
    }

    setLastDownload(download: Download | null): void {
        this.lastDownload = download;
    }
}


export { PlaywrightWorld };
