import Options from "../components/Options.svelte";
import '../app.postcss';

// Options
// https://developer.chrome.com/docs/extensions/mv3/options/

function render() {
    const target = document.getElementById("app");

    if (target) {
        return new Options({
            target,
            props: {},
        });
    }
}

document.addEventListener("DOMContentLoaded", render);
