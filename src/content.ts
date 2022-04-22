import $ from "jquery";
import tippy from "tippy.js";

/**
 * Generate HTML code for a tooltip element.
 */
function tooltipHTML() {
  return `<button>Highlight</button>`;
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
 * @type {boolean} - Flag to prevent multiple instances of the
 *     tooltip from being visible at the same time
 */
let tooltipVisible: boolean = false;

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
 */
function attachTooltipToElement(elem: HTMLElement) {
  if (tooltipVisible) return undefined;

  tooltipVisible = true;

  const tip = tippy(elem, { content: tooltipHTML(), ...TOOLTIP_OPTIONS });

  const destroyTip = () => {
    tip.destroy();
    tooltipVisible = false;
  };

  document.addEventListener("mouseup", destroyTip, { once: true });

  return tip;
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

  attachTooltipToElement(end as HTMLElement);

}

document.addEventListener("mouseup", attachTooltipToSelection);
