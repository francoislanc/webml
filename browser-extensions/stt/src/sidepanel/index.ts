import Record from "../components/Record.svelte";
import { storage } from "../storage";

// Side panel
// https://developer.chrome.com/docs/extensions/reference/sidePanel/

function render() {
    const target = document.getElementById("app");

    if (target) {
        storage.get().then(({ count }) => {
            new Record({
                target,
                props: {},
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", render);
