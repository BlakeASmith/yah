import { attachTooltipToSelection } from "./tooltip";
import { storeHighlight } from "./store";
import { Highlight } from "./highlight";

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

document.addEventListener("highlight", (event: Event) => {
  event.preventDefault();

  const range = (event as CustomEvent).detail as Highlight;
  storeHighlight(range);
});
