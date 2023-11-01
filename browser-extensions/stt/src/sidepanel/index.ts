import Record from "../components/Record.svelte";

// Side panel
// https://developer.chrome.com/docs/extensions/reference/sidePanel/

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
