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
 * @returns {HTMLElement | undefined} The tooltip element, or undefined
 */
function attachTooltipToElement(elem: HTMLElement): HTMLElement {
  const tipElement = tooltipHTML();

  const tip = tippy(elem, { content: tipElement, ...TOOLTIP_OPTIONS });

  const destroyTip = () => {
    // Delay some time to allow click events to process
    setTimeout(tip.destroy.bind(tip), 100);
  };

  document.addEventListener("mouseup", destroyTip, { once: true });

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
function attachTooltipToSelection() {
  const selection = window.getSelection();
  const range = getSelectionRange(selection);

  if (range === undefined) return undefined;

  const end = getNearestNonTextElement(range.endContainer);

  const tooltip = attachTooltipToElement(end as HTMLElement);

  if (tooltip === undefined) return;

  tooltip.addEventListener("click", () => {
    console.log("clicked");
  });
}

document.addEventListener("mouseup", attachTooltipToSelection);
