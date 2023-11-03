import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import manifest from "./src/manifest.config";
import Icons from 'unplugin-icons/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), crx({ manifest }), Icons({
    compiler: 'svelte',
  }),],
  // HACK: https://github.com/crxjs/chrome-extension-tools/issues/696
  // https://github.com/crxjs/chrome-extension-tools/issues/746
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/offscreen.html',
      },
    },
  },
});
