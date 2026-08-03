/**
 * Shared typings for the Cucumber step-definition files that drive the
 * Selenium WebDriver and Playwright E2E runners
 * (`src/testing/test-runners/*\/stepdefs.ts`).
 *
 * These are intentionally minimal: only the fields the step definitions
 * actually read are modeled. The full parameter/World shapes live on
 * `SeleniumWebdriverWorld` / `PlaywrightWorld`, which are typed loosely
 * (`any`) on purpose since they are populated from parsed scenario JSON.
 */

/** Per-scenario test execution parameters, as read by the step definitions. */
export interface TestExecutionParameters {
	waitTime: number;
}

// `selenium-webdriver` ships no type declarations (this repo ambiently declares it as an
// untyped module in `src/types/vendor.d.ts`), so `WebDriver`/`WebElement` cannot be imported
// as real types. These hand-rolled interfaces model only the methods the step definitions
// actually call.

/** Subset of selenium-webdriver's `WebElement` API used by the step definitions. */
export interface SeleniumElement {
	click(): Promise<void>;
	clear(): Promise<void>;
	sendKeys(...keys: unknown[]): Promise<void>;
	getText(): Promise<string>;
	getAttribute(name: string): Promise<string>;
	getCssValue(name: string): Promise<string>;
	getTagName(): Promise<string>;
	isSelected(): Promise<boolean>;
	findElements(locator: unknown): Promise<SeleniumElement[]>;
}

/**
 * selenium-webdriver's `driver.wait()`/`driver.findElement()` resolve to a `WebElementPromise`:
 * a Promise that also exposes `WebElement` methods directly, so callers can chain
 * (e.g. `driver.wait(...).click()`) without an intermediate `await`.
 */
export type SeleniumElementPromise = Promise<SeleniumElement> & SeleniumElement;

/** Chainable action-sequence builder returned by `driver.actions()`. */
export interface SeleniumActionSequence {
	move(options: { origin?: SeleniumElement, x?: number, y?: number }): SeleniumActionSequence;
	click(): SeleniumActionSequence;
	perform(): Promise<void>;
}

/** Subset of selenium-webdriver's `WebDriver` API used by the step definitions. */
export interface SeleniumDriver {
	manage(): {
		setTimeouts(options: { implicit?: number, pageLoad?: number, script?: number }): Promise<void>
		addCookie(cookie: { name: string, value: string }): Promise<void>
		deleteCookie(name: string): Promise<void>
	};
	executeScript<T = unknown>(script: string, ...args: unknown[]): Promise<T>;
	sleep(ms: number): Promise<void>;
	// `message` is loosely typed: some call sites pass a poll-interval number here instead
	// of a message string (a pre-existing quirk, kept as-is to avoid behaviour changes)
	wait<T = SeleniumElement>(condition: unknown, timeout?: number, message?: string | number, pollTimeout?: number): Promise<T> & T;
	findElement(locator: unknown): SeleniumElementPromise;
	get(url: string): Promise<void>;
	getCurrentUrl(): Promise<string>;
	getAllWindowHandles(): Promise<string[]>;
	switchTo(): { window(handle: string): Promise<void> };
	actions(options?: { bridge?: boolean }): SeleniumActionSequence;
	quit(): Promise<void>;
}
