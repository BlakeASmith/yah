import _, { PairValue } from "underscore";
import tippy from "tippy.js";
import React, { MouseEventHandler } from "react";
import ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { createGlobalStyle } from "styled-components";

type HighlightColor = {
  name: string;
  hex: string;
};

const COLORS: Array<HighlightColor> = [
  { name: "yellow", hex: "#FBE7C6" },
  { name: "mint", hex: "#B4F8C8" },
  { name: "tiffany-blue", hex: "#A0E7E5" },
  { name: "hot-pink", hex: "#FFAEBC" },
];

COLORS.forEach((color) => {
  document.styleSheets[0].insertRule(
    `.${color.name}, .${color.name} :not(.hl) :not(#hl-tool *) { background: ${color.hex}; border-radius: 10%; }`
  );
});

type ToolTipProps = {
  colors: Array<HighlightColor>;
};

type Highlighter = MouseEventHandler<HTMLButtonElement>;

function makeHighlighter(hlColor: HighlightColor): Highlighter {
  return (event) => {
    event.preventDefault();

    const selection = window.getSelection();
    if (selection === undefined || selection === null) return;

    highlightSelection(selection, { color: hlColor });

    selection.removeAllRanges();
  };
}

const ToolTip = ({ colors }: ToolTipProps) => (
  <div id="hl-tool">
    {colors.map((hlColor: HighlightColor) => (
      <span>
        <button
          onClick={makeHighlighter(hlColor)}
          className="circ"
          style={{ background: hlColor.hex }}
        ></button>
      </span>
    ))}
  </div>
);

/**
 * Generate HTML code for a tooltip element.
 */
function tooltipHTML(): HTMLElement {
  const span = document.createElement("span");

  ReactDOM.render(<ToolTip colors={COLORS} />, span);
  return span;
}

/**
 * @type {object} - Options for the 'tippy.js' tooltip
 */
const TOOLTIP_OPTIONS: object = {
  interactive: true,
  allowHTML: true,
  showOnCreate: true,
  sticky: true,
  trigger: "manual",
  placement: "right-end",
};

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

function fixRangeBounds(selection: Selection, range: Range) {
  range.setStart(
    findBeginningOfText(selection, range) as Node,
    range.startOffset
  );

  range.setEnd(findEndOfText(range) as Node, range.endOffset);
}

function complexSurroundContents(
  selection: Selection,
  range: Range,
  wrapper: HTMLElement
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
        const _wrapper = wrapper.cloneNode();
        _wrapper.appendChild(subRange.extractContents());
        subRange.insertNode(_wrapper);
      } else {
        if (node.textContent === "") return;
        const subRange = new Range();
        subRange.setStart(node, 0);
        subRange.setEnd(node, node.textContent!!.length);
        subRange.surroundContents(wrapper.cloneNode());
      }
    });

  const startRange = new Range();
  startRange.setStart(range.startContainer, range.startOffset);
  startRange.setEnd(
    range.startContainer,
    range.startContainer.textContent!!.length
  );
  startRange.surroundContents(wrapper.cloneNode());

  // It can happen sometimes that the end node is not actually part of the selection
  if (!selection.containsNode(range.endContainer)) return;

  const endRange = new Range();
  endRange.setStart(range.endContainer, 0);
  endRange.setEnd(range.endContainer, range.endOffset);
  endRange.surroundContents(wrapper);
}

function highlightSelection(
  selection: Selection,
  { color } = { color: COLORS[0] }
) {
  const range = selection.getRangeAt(0);
  const { startContainer, endContainer } = range;

  const wrapper = document.createElement("span");
  wrapper.classList.toggle(color.name);
  wrapper.classList.toggle("hl");

  startContainer == endContainer
    ? range.surroundContents(wrapper)
    : complexSurroundContents(selection, range, wrapper);
}

/**
 * Get the selection range only if the selection is not empty.
 *
 * @param {Selection} selection - The current selection
 * @returns {Range | undefined} - The selection range, or undefined
 */
function getSelectionRange(
  selection: Selection | undefined | null
): Range | undefined {
  const range = selection?.getRangeAt(0);
  return range?.toString()?.length == 0 ? undefined : range;
}

/**
 * Create the highlighting tooltip over an HTML element.
 *
 * The tooltip will be destroyed on the next 'mouseup' event, when the
 * user clicks away from the selection or makes another selection.
 *
 * @param {HTMLElement} elem: The element to attach to
 *
 * @returns {HTMLELement} - The tooltip element
 */
function attachTooltipToElement(
  elem: HTMLElement,
  { destroy, rect }: { rect: DOMRect | undefined; destroy: Boolean } = {
    destroy: false,
    rect: undefined,
  }
): HTMLElement {
  const tipElement = tooltipHTML();

  const tip = tippy(elem, { content: tipElement, ...TOOLTIP_OPTIONS });

  if (rect)
    tip.setProps({
      getReferenceClientRect: () => rect,
    });

  // Destroy the tooltip when the selection is cleared.
  document.addEventListener(
    "mouseup",
    (e: Event) => {
      // Add some delay to handle onClick code
      setTimeout(() => {
        if (e.target !== tipElement) {
          tip.destroy();
          if (destroy === true) elem.remove();
        }
      }, 200);
    },
    { once: true }
  );

  return tipElement;
}

/**
 * Create the highlighting tooltip over the currently selected element.
 */
function attachTooltipToSelection() {
  const selection = window.getSelection();
  const range = getSelectionRange(selection);

  if (range === undefined || selection === undefined) return undefined;

  fixRangeBounds(selection!!, range!!);

  const tooltipAttachPoint = document.createElement("span");
  tooltipAttachPoint.id = "tooltip-attach";
  tooltipAttachPoint.style.position = "absolute";

  (range.endContainer as ChildNode).after(tooltipAttachPoint);

  attachTooltipToElement(tooltipAttachPoint as HTMLElement, {
    destroy: true,
    rect: range.getBoundingClientRect(),
  });
}

function doOnSelection(action: () => void) {
  let clickCount = 0;

  const clickDelays = new Map<number, number>([
    [1, 500],
    [2, 500],
    [3, 0],
  ]);
  document.addEventListener("mouseup", (event: MouseEvent) => {
    event.preventDefault();
    if (event.target instanceof HTMLButtonElement) return;
    clickCount += 1;

    console.log(clickCount, event.detail);
    setTimeout(() => {
      if (event.detail >= clickCount) {
        action();
        clickCount = 0;
      }
      if (clickCount == 3) clickCount = 0;
    }, clickDelays.get(clickCount));
  });
}

doOnSelection(attachTooltipToSelection);
