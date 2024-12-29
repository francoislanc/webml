import CaptureOverlay from "@/lib/CaptureOverlay.svelte";
import { mount, unmount } from "svelte";
import { ContentScriptContext } from "wxt/client";

export default defineContentScript({
  // Set "registration" to runtime so this file isn't listed in manifest
  registration: "runtime",
  // Use an empty array for matches to prevent any host_permissions be added
  //  when using `registration: "runtime"`.
  matches: [],
  // Put the CSS in the shadow root
  cssInjectionMode: "ui",

  async main(ctx) {
    // console.log("Content script executed!");
    const ui = await createUi(ctx);
    ui.mount();

    // Optionally, return a value to the background
    return "Hello world!";
  },
});

function createUi(ctx: ContentScriptContext) {
  return createIntegratedUi(ctx, {
    position: "inline",
    anchor: "body",
    append: "first",
    onMount: (container) => {
      // Create the Svelte app inside the UI container
      const app = mount(CaptureOverlay, { target: container });
      return app;
    },
    onRemove: (app) => {
      // Destroy the app when the UI is removed
      if (app) {
        unmount(app);
      }
    },
  });
}
