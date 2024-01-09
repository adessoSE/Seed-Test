import { Injectable } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root",
})
export class HighlightInputService {
  constructor(public toastr: ToastrService, public apiService: ApiService) {}
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
   * @returns if a regex was detected
   */
  highlightRegex(
    element,
    initialCall?: boolean,
    isDark?: boolean,
    regexInStory?: boolean,
    valueIndex?: number,
    stepPre?: string
  ) {
    const regexPattern = /(\{Regex:)(.*?)(\})/g; // Regex pattern to recognize and highlight regex expressions -> start with {Regex: and end with }

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
    let highlightedText;
    // TODO: Hardcoded Styles
    if (!valueIndex || (0 == valueIndex && regexSteps.includes(stepPre))) {
      highlightedText = textContent.replace(
        regexPattern,
        (match, match1, match2, match3) => {
          regexDetected = true;
          var identifier = `specialInputId${
            Date.now().toString(36) + Math.random().toString(36).substr(2)
          }`;
          this.apiService.resolveSpecialCommand(match).subscribe({
            next: (resolvedCommand) => {
              console.log("RECIEVED: " + resolvedCommand);
              document
                .querySelector(`#${identifier}`)
                .setAttribute("uk-tooltip", `title:${resolvedCommand}`);
            },
            error: (error) => {
              console.log(error.error.error);
              document
                .querySelector(`#${identifier}`)
                .setAttribute(
                  "uk-tooltip",
                  `title:Error: ${error.error.error}`
                );
            },
          });
          return (
            `<span uk-tooltip="title:Resolving Command ..." id="${identifier}">` +
            `<span style="color: ${
              isDark ? "var(--light - grey)" : "var(--brown-grey)"
            }; font-weight: bold">${match1}</span>` +
            `<span style="color: ${
              isDark ? "var(--light-blue)" : "var(--ocean-blue)"
            }; font-weight: bold">${match2}</span>` +
            `<span style="color: ${
              isDark ? "var(--light-grey)" : "var(--brown-grey)"
            }; font-weight: bold">${match3}</span></span>`
          );
        }
      );
    }
    textField.innerHTML = highlightedText ? highlightedText : textContent;

    // Toastr logic
    if (initialCall && regexDetected) {
      regexInStory = true;
    }
    if (regexDetected && !regexInStory) {
      this.toastr.info(
        "View our Documentation for more Info",
        "Regular Expression detected!"
      );
    }

    // Set cursor to correct position
    if (!initialCall) {
      if (regexDetected) {
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
