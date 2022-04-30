import { MouseEventHandler } from "react";
import _ from "underscore";

export type HighlightColor = {
  name: string;
  hex: string;
};

export type Highlight = {
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

export function highlightSelection(
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

  emitHighlightEvent({ color, range });
}

function emitHighlightEvent(hl: Highlight) {
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
