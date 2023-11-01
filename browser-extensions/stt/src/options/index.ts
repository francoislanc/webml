import Options from "../components/Options.svelte";

// Options
// https://developer.chrome.com/docs/extensions/mv3/options/

function render() {
    const target = document.getElementById("app");

    if (target) {
        return new Options({
            target,
            props: {count: 0},
        });
    }
}

document.addEventListener("DOMContentLoaded", render);
