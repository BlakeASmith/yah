import $ from "jquery";
import tippy from "tippy.js";

type UnwrapFunction = () => void;

const WRAPPER_CLASS_NAME = "iswrapper";

/**
 * Generate HTML code for a tooltip element.
 */
function tooltipHTML() {
  return `<button>TOOLTIP</button>`;
}

/**
 * Wrap Text nodes in aspan. If a non-text node is provided it will
 * not be wrapped.
 *
 * This allows the tooltip element to be attached to the end of the
 * highlighted region.
 *
 * @param {Node} textElement - The node to be wrapped
 *
 * @return {[HTMLElement, UnwrapFunction]} - The wrapper node (a span) and a
 *     function which will remove the wrapper node from the DOM
 */
function wrapTextNodes(textElement: Node): [HTMLElement, UnwrapFunction] {
  let wrapper: HTMLElement | undefined = undefined;
  while (textElement instanceof Text) {
    wrapper = document.createElement("span");
    wrapper.classList.toggle(WRAPPER_CLASS_NAME);
    textElement.parentNode?.insertBefore(wrapper, textElement);
    textElement.parentNode?.removeChild(textElement);
    wrapper.appendChild(textElement);
    textElement = wrapper;
  }

  return [
    textElement as HTMLElement,
    () => {
      if (wrapper === undefined) return;
      if (wrapper.classList.contains(WRAPPER_CLASS_NAME))
        wrapper.parentElement?.replaceChild(wrapper.childNodes[0], wrapper);
    },
  ];
}

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

  const tip = tippy(elem, {
    content: tooltipHTML(),
    interactive: true,
    allowHTML: true,
    showOnCreate: true,
    sticky: true,
    trigger: "manual",
  });

  const destroyTip = () => {
    tip.destroy();
    tooltipVisible = false;
  };

  document.addEventListener("mouseup", destroyTip, { once: true });

  return tip;
}

/**
 * Create the highlighting tooltip over the currently selected element.
 *
 * Text nodes will be wrapped temporarily with a span so that the
 * tooltip can be properly attached.
 */
function attachTooltipToSelection() {
  const selection = window.getSelection();
  const range = getSelectionRange(selection);

  if (range === undefined) return undefined;
  const [end, unwrap] = wrapTextNodes(range.endContainer);

  attachTooltipToElement(end);

  document.addEventListener("mouseup", unwrap, { once: true });
  document.addEventListener(
    "mousedown",
    selection!!.removeAllRanges.bind(selection),
    { once: true }
  );
}

document.addEventListener("mouseup", attachTooltipToSelection);
