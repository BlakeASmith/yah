import $ from "jquery";
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
      if (e.target !== tipElement)
          tip.destroy();
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
      const selected = selection!!.toString()
      console.log(selected)
    tooltip.remove();
  });
}

document.addEventListener("mouseup", attachTooltipToSelection);
