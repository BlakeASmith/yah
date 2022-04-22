import $ from "jquery";
import tippy from 'tippy.js';

type UnwrapFunction = () => void

const WRAPPER_CLASS_NAME = "iswrapper";

function tooltipHTML() {
    return `<button>TOOLTIP</button>`;
}

function wrapTextNodes(textElement: Node): [Node, UnwrapFunction] {
    let wrapper: HTMLElement | undefined = undefined;
    while (textElement instanceof Text) {
        wrapper = document.createElement('span');
        wrapper.classList.toggle(WRAPPER_CLASS_NAME);
        textElement.parentNode?.insertBefore(wrapper, textElement);
        textElement.parentNode?.removeChild(textElement);
        wrapper.appendChild(textElement);
        textElement = wrapper;
    }

    return [textElement, () => {
        if (wrapper === undefined) return;
        console.log("unwrapping")
        console.log(wrapper)
        if (wrapper.classList.contains(WRAPPER_CLASS_NAME))
            wrapper.parentElement?.replaceChild(wrapper.childNodes[0], wrapper);
    }];
}

let tooltipVisible: boolean = false;

document.addEventListener('mouseup', () => {
    if (tooltipVisible) return;

    const selection = window.getSelection()?.getRangeAt(0);

    if (selection === undefined || selection.toString().length == 0) return;

    const [end, unwrap] = wrapTextNodes(selection.endContainer);

    const tip = tippy(end as HTMLElement, {
        content: tooltipHTML(),
        interactive: true,
        allowHTML: true,
        showOnCreate: true,
        sticky: true,
        theme: 'tomato',
        trigger: 'manual',
    });

    tooltipVisible = true;

    const destroyTip = () => {
        tip.destroy();
        tooltipVisible = false;
        document.removeEventListener('mouseup', destroyTip);

        unwrap();
    }

    document.addEventListener('mouseup', destroyTip);
});
