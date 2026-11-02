/**
 * Escapes a string so it can be embedded in a RegExp literally.
 * @param text Plain text, e.g. a scenario name or a step type label.
 * @returns The text with regex metacharacters escaped.
 */
export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
