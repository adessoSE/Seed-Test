import type { ConsoleMessage } from '@playwright/test';
import { APP_ORIGINS } from './config';

/**
 * Appends a console message to the runtime error list when it is an error from the app or its backend.
 * WHY: fonts and other external hosts fail on offline machines, so only errors from our own origins count.
 * @param message Console message of a page.
 * @param runtimeErrors List that collects the recorded messages.
 * @param label Prefix of the recorded message, so a member context can be told apart from the owner.
 */
export function recordAppConsoleError(message: ConsoleMessage, runtimeErrors: string[], label = 'console'): void {
	if (message.type() !== 'error')
		return;
	const url = message.location().url;
	// CASE 1: messages without a source location come from the page itself and always count
	if (url !== '' && !(URL.canParse(url) && APP_ORIGINS.has(new URL(url).origin)))
		return;
	runtimeErrors.push(`${label}: ${message.text()}`);
}
