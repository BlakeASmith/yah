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

type TooltipProps = {
  colors: Array<HighlightColor>;
  selectedColor: HighlightColor | undefined;
};

const ToolTip = ({ colors, selectedColor }: TooltipProps) => (
  <div id="hl-tool">
    {colors.map((hlColor: HighlightColor) =>
      selectedColor ? (
        <span>
          <button className="circ" style={{ background: hlColor.hex }}></button>
        </span>
      ) : (
        <span>
          <button
            onClick={highlightSelectionOnEvent(hlColor)}
            className="circ"
            style={{ background: hlColor.hex }}
          ></button>
        </span>
      )
    )}
  </div>
);

/**
 * Generate HTML code for a tooltip element.
 */
function tooltipHTML(
  colors: Array<HighlightColor>,
  selected: HighlightColor | undefined = undefined
): HTMLElement {
  const span = document.createElement("span");

  ReactDOM.render(<ToolTip colors={colors} selectedColor={selected} />, span);
  return span;
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

export type TooltipAttachOptions = {
  rect?: DOMRect;
  destroy?: boolean;
  selectedColor?: HighlightColor;
};

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
export function attachTooltipToElement(
  elem: HTMLElement,
  { destroy, rect, selectedColor }: TooltipAttachOptions = {
    destroy: true,
    rect: undefined,
    selectedColor: undefined,
  }
): HTMLElement {
  const tipElement = tooltipHTML(COLORS, selectedColor);

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
export function attachTooltipToSelection() {
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
    selectedColor: undefined,
  });
}
