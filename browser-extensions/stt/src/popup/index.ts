import Popup from "../components/Popup.svelte";
import '../app.postcss';

// Action popup
// https://developer.chrome.com/docs/extensions/reference/action/

function render() {
    const target = document.getElementById("app");

    if (target) {
        return new Popup({
            target,
            props: {},
        });
    }
}

document.addEventListener("DOMContentLoaded", render);
