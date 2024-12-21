import { MouseEventHandler } from "react";
import _ from "underscore";
import { attachTooltipToElement } from "./tooltip";
import { v4 as uuid } from "uuid";
import getXPath from "get-xpath"
import { getHighlightsForDomain, Highlight, saveHighlight, storeHighlight } from "./store";

// Function to handle highlighting
async function processHighlights() {
  const highlights = await getHighlightsForDomain(location.hostname);
  highlights.forEach((highlight) => highlightHighlight(highlight));
}

// Function to set up a MutationObserver
function setupMutationObserver() {
  // Select the node to observe (e.g., the body of the document)
  const targetNode = document.body;

  // Define the configuration for the observer
  const config = {
    childList: true,      // Observe changes to child elements
    subtree: true,        // Observe changes in the entire subtree
    attributes: false,    // (Optional) Track attribute changes
  };

  // Create a MutationObserver instance
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      // Run the highlight logic whenever mutations occur
      if (mutation.type === 'childList') {
        processHighlights();
      }
    }
  });

  // Start observing the target node with the specified configuration
  observer.observe(targetNode, config);

  console.log('MutationObserver is now observing DOM changes.');
}

// Initialize the observer
setupMutationObserver();


export type HighlightColor = {
  name: string;
  hex: string;
};

export type UIHighlight = {
  id: string;
  color: HighlightColor;
  range: Range;
};

const COLORS: Array<HighlightColor> = [
  { name: "yellow", hex: "#FBE7C6" },
  { name: "mint", hex: "#B4F8C8" },
  { name: "tiffany-blue", hex: "#A0E7E5" },
  { name: "hot-pink", hex: "#FFAEBC" },
];

export function getColors(): Array<HighlightColor> {
  const stylesheet = COLORS.map(
    (color) =>
      `.${color.name}, .${color.name} :not(.hl) :not(#hl-tool *) { background: ${color.hex}; border-radius: 10%; }`
  ).reduce((acc, cur) => acc + "\n" + cur);

  const style = document.createElement("style");
  style.innerHTML = stylesheet;

  document.head.appendChild(style);

  return COLORS;
}

export type Highlighter = MouseEventHandler<HTMLButtonElement>;

function findFirstText(el: Element): Element | undefined {
  if (el.childNodes.length === 0) return el.textContent !== "" ? el : undefined;

  let firstText: Element | undefined;

  _.find(el.childNodes, (child) => {
    firstText = findFirstText(child as Element);
    return firstText !== undefined;
  });

  return firstText;
}

/*
 * If an element is not in the selection, we need to check if any
 * of it's children might be, and we need to do so
 * recursively. This is because the common ancestor might be
 * multiple levels up in the DOM tree
 */
function getNodesInSelection(selection: Selection, range: Range) {
  function expandChildren(node: Node): Array<Node> {
    return selection.containsNode(node) || node.childNodes.length == 0
      ? [node]
      : Array.from(node.childNodes).flatMap(expandChildren);
  }

  return Array.from(range.commonAncestorContainer.childNodes)
    .flatMap(expandChildren)
    .filter((node) => selection.containsNode(node));
}

function findBeginningOfText(
  selection: Selection,
  range: Range
): Element | undefined {
  let startContainer: Element | undefined = findFirstText(
    range.startContainer as Element
  );

  if (startContainer === undefined) {
    const selectedNodes = getNodesInSelection(selection, range);
    _.find(selectedNodes, (node) => {
      startContainer = findFirstText(node as Element);
      return startContainer !== undefined;
    });
  }

  return startContainer as Element;
}

function findEndOfText(range: Range): Element | undefined {
  let next: Node | ChildNode | undefined | null = range.endContainer;

  do {
    const text = findFirstText(next as Element);
    if (text !== undefined) return text;
    else next = next.previousSibling;
  } while (next);

  return undefined;
}

export function fixRangeBounds(selection: Selection, range: Range) {
  range.setStart(
    findBeginningOfText(selection, range) as Node,
    range.startOffset
  );

  range.setEnd(findEndOfText(range) as Node, range.endOffset);
}

function complexSurroundContents(
  selection: Selection,
  range: Range,
  makeWrapper: () => HTMLElement
): void {
  fixRangeBounds(selection, range);
  getNodesInSelection(selection, range)
    .filter((node) => node !== range.startContainer)
    .filter((node) => node !== range.endContainer)
    .forEach((node) => {
      if (node.nodeType != node.TEXT_NODE) {
        const subRange = new Range();
        subRange.setStart(node, 0);
        subRange.setEnd(node, node.childNodes.length);
        const _wrapper = makeWrapper();
        _wrapper.appendChild(subRange.extractContents());
        subRange.insertNode(_wrapper);
      } else {
        if (node.textContent === "") return;
        const subRange = new Range();
        subRange.setStart(node, 0);
        subRange.setEnd(node, node.textContent!!.length);
        subRange.surroundContents(makeWrapper());
      }
    });

  const startRange = new Range();
  startRange.setStart(range.startContainer, range.startOffset);
  startRange.setEnd(
    range.startContainer,
    range.startContainer.textContent!!.length
  );
  startRange.surroundContents(makeWrapper());

  // It can happen sometimes that the end node is not actually part of the selection
  if (!selection.containsNode(range.endContainer)) return;

  const endRange = new Range();
  endRange.setStart(range.endContainer, 0);
  endRange.setEnd(range.endContainer, range.endOffset);
  endRange.surroundContents(makeWrapper());
}

function makeHighlightWrapper(
  color: HighlightColor,
  highlightID: string
): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.classList.toggle(color.name);
  wrapper.classList.toggle("hl");
  wrapper.classList.toggle(highlightID);

  wrapper.addEventListener("click", (event: MouseEvent) => {
    if (event.target == null) return;
    attachTooltipToElement(event.target as HTMLElement, {
      selectedColor: color,
    });
  });

  return wrapper;
}

function createHL(
  props: {
    userId: string,
    highlightId: string,
    range: Range,
    color: HighlightColor
  }
) {
  let {startContainer, endContainer} = props.range;

  const hl: Highlight = {
    id: props.highlightId, 
    domain: location.hostname,
    url: location.href,
    text: props.range.toString(),
    position: {
      startOffset: props.range.startOffset,
      endOffset: props.range.endOffset,
      startXpath: getXPath(startContainer),
      endXpath: getXPath(endContainer),
    },
    color: props.color,
    createdAt: new Date().toISOString(),
    userId: props.userId,
  };

  return hl
}

export function highlightSelection(
  selection: Selection,
  { color } = { color: COLORS[0] }
) {
  const range = selection.getRangeAt(0);
  const { startContainer, endContainer } = range;

  const highlightID = `hl-${uuid()}`;

  const hl = createHL({
    highlightId: highlightID,
    range: range,
    color: color,
    userId: chrome.runtime.id
  })

  saveHighlight(hl);
  console.log(hl);

  startContainer == endContainer
    ? range.surroundContents(makeHighlightWrapper(color, highlightID))
    : complexSurroundContents(selection, range, () =>
        makeHighlightWrapper(color, highlightID)
      );

  emitHighlightEvent({ id: highlightID, color, range });
}

function getRangeFromHighlight(highlight: Highlight): Range | null {
  const startElement = document.evaluate(highlight.position.startXpath, document)
    .iterateNext()
  const endElement = document.evaluate(highlight.position.endXpath, document)
    .iterateNext()

  if (startElement === null || endElement === null) {
    console.log("Could not find start or end element for highlight %s", highlight.id)
    return null
  }

  const range = new Range(); 
  range.setStart(startElement!!, highlight.position.startOffset);
  range.setEnd(endElement!!, highlight.position.endOffset);
  return range
}

function highlightHighlight(highlight: Highlight) {
  const range = getRangeFromHighlight(highlight);
  if (range === null) {
    return
  }
  console.log("could not find elements to highlight")
  range.surroundContents(makeHighlightWrapper(highlight.color, highlight.id));
}

function emitHighlightEvent(hl: UIHighlight) {
  const highlightEvent = new CustomEvent("highlight", { detail: hl });
  document.dispatchEvent(highlightEvent);
}

export function highlightSelectionOnEvent(
  hlColor: HighlightColor
): Highlighter {
  return (event) => {
    event.preventDefault();

    const selection = window.getSelection();
    if (selection === undefined || selection === null) return;

    highlightSelection(selection, { color: hlColor });

    selection.removeAllRanges();
  };
}
