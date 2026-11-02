import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from './api.service';

/** Characters that must not reach innerHTML as markup (step text is untrusted) */
const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/** Inverse of HTML_ESCAPES, used to give the backend the original characters */
const HTML_UNESCAPES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'"
};

@Injectable({
	providedIn: 'root'
})
export class HighlightInputService {
	apiService = inject(ApiService);

	targetOffset: number = 0;

	/**
   * Add value and highlight regex, Style regex in value and give value to addToValue() function
   * Value is in textContent and style is in innerHTML
   * If initialCall only check if a regex is already there and hightlight it
   * If valueIndex only hightlights regex in first field of regexSteps, only then steps for now. Gets checked with stepPre
   * Get cursor position with getCaretCharacterOffsetWithin Helper and set position again, else it is lost because of overwriting and changing the HTML Element in case of hightlighting
   * @param element HTML element of contentedible div
   * @param initialCall if call is from ngAfterView
   * @param isDark theming Service
   * @param regexInStory if first regex in Story
   * @param valueIndex index of input field
   * @param stepPre pre text of step
   * @param highlightRegex if regex should be detexted and highlighted
   * @returns if a regex was detected
   */
	highlightInput(
		element: HTMLElement,
		initialCall?: boolean,
		isDark?: boolean,
		regexInStory?: boolean,
		valueIndex?: number,
		stepPre?: string,
		highlightRegex?: boolean
	) {
		const textField = element;
		const textContent = textField.textContent ?? '';
		//Get current cursor position
		const offset = this.getCaretCharacterOffsetWithin(textField);
		const regexSteps = [
			'So I can see the text',
			'So I can see the text:',
			"So I can't see the text:",
			"So I can't see text in the textbox:"
		];
		let regexDetected = false;
		// Escaped before any markup is added: step text is user content and must never be parsed as HTML.
		// Escaping keeps textContent (and therefore the caret offsets) identical to the original text.
		const escapedText = this.escapeHtml(textContent);
		let highlightedText = escapedText;

		if (!valueIndex || (0 == valueIndex && regexSteps.includes(stepPre!))) {
			if (highlightRegex)
				({ regexDetected, highlightedText } = this.highlightRegex(
					highlightedText,
					isDark
				));

			({ highlightedText } =
				this.highlightSpecialCommands(highlightedText, isDark));
		}
		textField.innerHTML = highlightedText ? highlightedText : escapedText;

		// Set cursor to correct position
		if (!initialCall) {
			//maybe not needed
			const selection = window.getSelection()!;
			selection.removeAllRanges();

			// Call the function to find the correct node and offset
			this.targetOffset = offset;
			const result = this.findNodeAndOffset(textField);

			if (result !== null) {
				const [node, offsetIndex] = result;
				requestAnimationFrame(() => {
					if (node.nodeType === 3)
					// Text node
						selection.setBaseAndExtent(node, offsetIndex, node, offsetIndex);
					else if (node.nodeType === 1 && node.childNodes.length > 0)
					// Element node with child nodes (e.g., <span>)
						selection.setBaseAndExtent(
							node.childNodes[0],
							offsetIndex,
							node.childNodes[0],
							offsetIndex
						);

				});
			}
		}
      
    
		return regexDetected;
	}

	/**
   * This function takes a html element and highlights the regex inside it if found.
   * @param element text already HTML-escaped by highlightInput (escapeHtml), so the spans added here are the only markup
   * @param isDark theming Service
   * @returns an object containing {regexDetected , highlightedText}
   */
	highlightRegex(element: string, isDark?: boolean) {
		const regexPattern = /(\{Regex:)(.*)(\})(.*)/g;

		const textContent = element;

		let regexDetected = false;
		// TODO: Hardcoded Styles
		const highlightedText = textContent.replace(
			regexPattern,
			(match: string, match1: string, match2: string, match3: string, match4: string) => {
				regexDetected = true;
				return (
					'<span>' +
          `<span style="color: ${
          	isDark ? 'var(--light - grey)' : 'var(--brown-grey)'
          }; font-weight: bold">${match1}</span>` +
          `<span style="color: ${
          	isDark ? '#ffbae1' : '#a71768'
          }; font-weight: bold">${match2}</span>` +
          `<span style="color: ${
          	isDark ? 'var(--light-grey)' : 'var(--brown-grey)'
          }; font-weight: bold">${match3}</span></span>${match4}`
				);
			}
		);
		return { regexDetected, highlightedText };
	}

	/**
   * This function takes a html element and highlights the special commands inside it if found.
   * @param element text already HTML-escaped by highlightInput (escapeHtml); the command sent to the backend is unescaped
   * @param isDark theming Service
   * @returns an object containing {regexDetected , highlightedText}
   */
	highlightSpecialCommands(element: string, isDark?: boolean) {
		const specialCommandsPattern =
			/(((((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+))((\+|-)(@@((\d|\d\d),)?[a-zA-Z]+))+)|(((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+)))(@@format:.*€€)?/g;

		const textContent = element;

		let specialCommandDetected = false;
		// TODO: Hardcoded Styles
		const highlightedText = textContent.replace(specialCommandsPattern, (match: string) => {
			specialCommandDetected = true;
			// The match is escaped markup; the backend must receive the original characters (e.g. '&' in a format string)
			const command = this.unescapeHtml(match);
			const identifier = `specialInputId${
				Date.now().toString(36) + Math.random().toString(36).substr(2)
			}`;
			this.apiService.resolveSpecialCommand(command).subscribe({
				next: (resolvedCommand) => {
					// CASE 1: backend echoed the command back, so it does not know it
					if (resolvedCommand === command)
						this.setTooltip(identifier, `Unknown command: ${resolvedCommand}`);
					// CASE 2: resolved to a value
					else
						this.setTooltip(identifier, resolvedCommand);
				},
				// CASE 3: backend rejected the command and its message echoes user text.
				// Status 0 (backend down) has no error.error.error, hence the fallback.
				error: (error: HttpErrorResponse) => {
					this.setTooltip(identifier, `Error: ${error.error?.error ?? 'Failed to resolve command'}`);
				}
			});
			return `<span data-tooltip="Resolving Command ..." id="${identifier}" style="color: ${
				isDark ? 'var(--light-blue)' : 'var(--ocean-blue)'
			}; font-weight: bold">${match}</span>`;
		});

		return { specialCommandDetected, highlightedText };
	}

	/**
	 * Writes the tooltip text of a special-command span into its data-tooltip attribute, which the
	 * global CSS renders via attr(). The span is looked up at callback time, because the editor may
	 * have re-rendered it while the request was pending.
	 * The text is stored and rendered as plain text, never parsed as HTML, so no escaping is needed
	 * and a backend message echoing user input cannot inject markup.
	 * @param identifier id of the special-command span
	 * @param text plain text (may contain user content) to show in the tooltip
	 */
	private setTooltip(identifier: string, text: string): void {
		document.querySelector(`#${identifier}`)?.setAttribute('data-tooltip', text);
	}

	/**
	 * Escapes text so it can be inserted via innerHTML as plain text.
	 * @param text untrusted user text
	 * @returns text with &amp; &lt; &gt; &quot; &#39; entities
	 */
	escapeHtml(text: string): string {
		return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
	}

	/**
	 * Reverses escapeHtml for the five entities it produces.
	 * Single pass, so '&amp;lt;' decodes to '&lt;' and not to '<'.
	 * @param text escaped text
	 * @returns original characters
	 */
	unescapeHtml(text: string): string {
		return text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => HTML_UNESCAPES[entity]);
	}

	/**
   * Helper for Regex Highlighter, find right node and index for current cursor position
   * @param element HTMLElement
   * @returns node: node with cursor, number: offest of cursor in node
   */
	findNodeAndOffset(element: Node): [Node, number] | null {
		if (element.nodeType === 3) {
			// Text node
			const textLength = (element.nodeValue || '').length;
			if (this.targetOffset <= textLength) 
				return [element, this.targetOffset];
			else 
				this.targetOffset -= textLength;
      
		} else if (element.nodeType === 1) 
		// Element node
			for (let i = 0; i < element.childNodes.length; i++) {
				const child = element.childNodes[i];
				const result = this.findNodeAndOffset(child);
				if (result !== null) 
					return result;
        
			}
    
		return null;
	}

	/**
   * Helper for Regex Highlighter, extract current cursor position
   * @param element HTMLElement
   * @returns num, offset of cursor position
   */
	getCaretCharacterOffsetWithin(element: HTMLElement) {
		let caretOffset = 0;
		const doc = element.ownerDocument ?? document;
		const win = doc.defaultView;
		if (win) {
			const sel = win.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0);
				const preCaretRange = range.cloneRange();
				preCaretRange.selectNodeContents(element);
				preCaretRange.setEnd(range.endContainer, range.endOffset);
				caretOffset = preCaretRange.toString().length;
			}
		}
		return caretOffset;
	}
}
