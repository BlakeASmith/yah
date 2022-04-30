import React from "react";
import ReactDOM from "react-dom";
import tippy from "tippy.js";
import {
  fixRangeBounds,
  getColors,
  HighlightColor,
  highlightSelectionOnEvent,
} from "./highlight";

const COLORS = getColors();

const ToolTip = () => (
  <div id="hl-tool">
    {COLORS.map((hlColor: HighlightColor) => (
      <span>
        <button
          onClick={highlightSelectionOnEvent(hlColor)}
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

  ReactDOM.render(<ToolTip />, span);
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
