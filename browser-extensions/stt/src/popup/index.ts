import Record from "../components/Record.svelte";

// Action popup
// https://developer.chrome.com/docs/extensions/reference/action/

function render() {
    const target = document.getElementById("app");

    if (target) {
        return new Record({
            target,
            props: {},
        });
    }
}

document.addEventListener("DOMContentLoaded", render);
