import { Injectable } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root",
})
export class HighlightInputService {
  constructor(public toastr: ToastrService, public apiService: ApiService) { }
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
    element,
    initialCall?: boolean,
    isDark?: boolean,
    regexInStory?: boolean,
    valueIndex?: number,
    stepPre?: string,
    highlightRegex?: boolean
  ) {
    const textField = element;
    const textContent = textField.textContent;
    //Get current cursor position
    const offset = this.getCaretCharacterOffsetWithin(textField);
    const regexSteps = [
      "So I can see the text",
      "So I can see the text:",
      "So I can't see the text:",
      "So I can't see text in the textbox:",
    ];
    var regexDetected = false;
    var specialCommandDetected = false;
    let highlightedText = textContent;

    if (!valueIndex || (0 == valueIndex && regexSteps.includes(stepPre))) {
      if (highlightRegex) {
        ({ regexDetected, highlightedText } = this.highlightRegex(
          highlightedText,
          isDark
        ));
      }
      ({ specialCommandDetected, highlightedText } =
        this.highlightSpecialCommands(highlightedText, isDark));
    }

    const examplesRegex = /<[^>]*>/;
    const match = textContent.match(examplesRegex);
    if (match && match.length > 0) {
      return match.input
    } else {
      textField.innerHTML = highlightedText ? highlightedText : textContent;
    }

    // Set cursor to correct position
    if (!initialCall) {
      if (true) {
        //maybe not needed
        const selection = window.getSelection();
        selection.removeAllRanges();

        // Call the function to find the correct node and offset
        this.targetOffset = offset;
        const result = this.findNodeAndOffset(textField);

        if (result !== null) {
          const [node, offsetIndex] = result;
          requestAnimationFrame(() => {
            if (node.nodeType === 3) {
              // Text node
              selection.setBaseAndExtent(node, offsetIndex, node, offsetIndex);
            } else if (node.nodeType === 1 && node.childNodes.length > 0) {
              // Element node with child nodes (e.g., <span>)
              selection.setBaseAndExtent(
                node.childNodes[0],
                offsetIndex,
                node.childNodes[0],
                offsetIndex
              );
            }
          });
        }
      } else {
        requestAnimationFrame(() => {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.setBaseAndExtent(
            textField.firstChild,
            offset,
            textField.firstChild,
            offset
          );
        });
      }
    }
    return regexDetected;
  }

  /**
   * This function takes a html element and highlights the regex inside it if found.
   * @param element HTML element of contentedible div
   * @param isDark theming Service
   * @returns an object containing {regexDetected , highlightedText}
   */
  highlightRegex(element, isDark) {
    const regexPattern = /(\{Regex:)(.*)(\})(.*)/g;

    const textContent = element;

    var regexDetected = false;
    let highlightedText;
    // TODO: Hardcoded Styles
    highlightedText = textContent.replace(
      regexPattern,
      (match, match1, match2, match3, match4) => {
        regexDetected = true;
        return (
          `<span>` +
          `<span style="color: ${isDark ? "var(--light - grey)" : "var(--brown-grey)"
          }; font-weight: bold">${match1}</span>` +
          `<span style="color: ${isDark ? "#ffbae1" : "#a71768"
          }; font-weight: bold">${match2}</span>` +
          `<span style="color: ${isDark ? "var(--light-grey)" : "var(--brown-grey)"
          }; font-weight: bold">${match3}</span></span>${match4}`
        );
      }
    );
    return { regexDetected, highlightedText };
  }

  /**
   * This function takes a html element and highlights the special commands inside it if found.
   * @param element HTML element of contentedible div
   * @param isDark theming Service
   * @returns an object containing {regexDetected , highlightedText}
   */
  highlightSpecialCommands(element, isDark) {
    const specialCommandsPattern =
      /(((((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+))((\+|-)(@@((\d|\d\d),)?[a-zA-Z]+))+)|(((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+)))(@@format:.*€€)?/g;

    const textContent = element;

    var specialCommandDetected = false;
    let highlightedText;
    // TODO: Hardcoded Styles
    highlightedText = textContent.replace(specialCommandsPattern, (match) => {
      specialCommandDetected = true;
      var identifier = `specialInputId${Date.now().toString(36) + this.getRandomString(10)}`;
      this.apiService.resolveSpecialCommand(match).subscribe({
        next: (resolvedCommand) => {
          if (resolvedCommand === match) {
            document
              .querySelector(`#${identifier}`)
              .setAttribute(
                "uk-tooltip",
                `title: Unknown command: ${resolvedCommand}`
              );
          } else {
            document
              .querySelector(`#${identifier}`)
              .setAttribute("uk-tooltip", `title:${resolvedCommand}`);
          }
        },
        error: (error) => {
          document
            .querySelector(`#${identifier}`)
            .setAttribute("uk-tooltip", `title:Error: ${error.error.error}`);
        },
      });
      return `<span uk-tooltip="title:Resolving Command ..." id="${identifier}" style="color: ${isDark ? "var(--light-blue)" : "var(--ocean-blue)"
        }; font-weight: bold">${match}</span>`;
    });

    return { specialCommandDetected, highlightedText };
  }

  getRandomString(length) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(36)).substr(-1)).join('');
  }
  /**
   * Helper for Regex Highlighter, find right node and index for current cursor position
   * @param element HTMLElement
   * @returns node: node with cursor, number: offest of cursor in node
   */
  findNodeAndOffset(element: Node): [Node, number] | null {
    if (element.nodeType === 3) {
      // Text node
      const textLength = (element.nodeValue || "").length;
      if (this.targetOffset <= textLength) {
        return [element, this.targetOffset];
      } else {
        this.targetOffset -= textLength;
      }
    } else if (element.nodeType === 1) {
      // Element node
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        const result = this.findNodeAndOffset(child);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Helper for Regex Highlighter, extract current cursor position
   * @param element HTMLElement
   * @returns num, offset of cursor position
   */
  getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
      sel = win.getSelection();
      if (sel.rangeCount > 0) {
        var range = win.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
      }
    } else if ((sel = doc.selection) && sel.type != "Control") {
      var textRange = sel.createRange();
      var preCaretTextRange = doc.body.createTextRange();
      preCaretTextRange.moveToElementText(element);
      preCaretTextRange.setEndPoint("EndToEnd", textRange);
      caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
  }
}
