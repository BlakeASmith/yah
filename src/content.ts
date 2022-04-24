import $ from "jquery";
import _ from "underscore";
import tippy from "tippy.js";

/**
 * Generate HTML code for a tooltip element.
 */
function tooltipHTML(): HTMLElement {
  const button = document.createElement("button");
  button.appendChild(document.createTextNode("Hello"));
  return button;
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
function attachTooltipToElement(elem: HTMLElement): HTMLElement {
  const tipElement = tooltipHTML();

  const tip = tippy(elem, { content: tipElement, ...TOOLTIP_OPTIONS });

  // Destroy the tooltip when the selection is cleared.
  document.addEventListener(
    "mouseup",
    (e: Event) => {
      if (e.target !== tipElement) tip.destroy();
    },
    { once: true }
  );

  return tipElement;
}

/**
 * Recursively move up the DOM until a non text node is found.
 *
 * @param {Text | Node} elem - A DOM node
 * @returns {Node} - The nearest ancestor node which is not a text node
 */
function getNearestNonTextElement(elem: Text | Node): Node {
  return elem instanceof Text
    ? getNearestNonTextElement(elem.parentElement!!)
    : elem;
}

/**
 * Create the highlighting tooltip over the currently selected element.
 */
function attachTooltipToSelection(event: Event) {
  if (event.target instanceof HTMLButtonElement) return;
  const selection = window.getSelection();
  const range = getSelectionRange(selection);

  if (range === undefined) return undefined;

  const end = getNearestNonTextElement(range.endContainer);

  const tooltip = attachTooltipToElement(end as HTMLElement);

  tooltip.addEventListener("click", () => {
    highlightSelection(selection!!);
    tooltip.remove();
  });
}

document.addEventListener("mouseup", attachTooltipToSelection);

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

function complexSurroundContents(
  selection: Selection,
  range: Range,
  wrapper: HTMLElement
): void {
  range.setStart(
    findBeginningOfText(selection, range) as Node,
    range.startOffset
  );

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

  const endRange = new Range();
  endRange.setStart(range.endContainer, 0);
  endRange.setEnd(range.endContainer, range.endOffset);
    endRange.surroundContents(wrapper);
}

function highlightSelection(selection: Selection) {
  const range = selection.getRangeAt(0);
  const { startContainer, endContainer } = range;

  const wrapper = document.createElement("span");
  wrapper.classList.toggle("highlight");

  startContainer == endContainer
    ? range.surroundContents(wrapper)
    : complexSurroundContents(selection, range, wrapper);
}
