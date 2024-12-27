import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-svelte", "@wxt-dev/i18n/module"],
  manifest: {
    permissions: ["tabCapture", "offscreen", "activeTab"],
    default_locale: "en",
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net; object-src 'self';",
    },
  },
});
