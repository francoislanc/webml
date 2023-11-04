/** @type {import('tailwindcss').Config}*/
const { skeleton } = require('@skeletonlabs/tw-plugin');


const config = {
  content: ["./src/**/*.{html,js,svelte,ts}", require('path').join(require.resolve(
    '@skeletonlabs/skeleton'),
    '../**/*.{html,js,svelte,ts}'
  )],

  theme: {
    extend: {},
  },

  plugins: [skeleton({
    themes: { preset: ["skeleton"] }
  })],
};

module.exports = config;
