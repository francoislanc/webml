<script lang="ts">
  import { db } from "../../lib/db";

  export const ERROR_MIC_PERMISSION = "Error requesting microphone permission";
  export const MIC_ACCESS_GRANTED = "Microphone access granted";

  let theme: string;
  const toggleTheme = async () => {
    if (theme === "dark") {
      theme = "light";
    } else {
      theme = "dark";
    }
    await db.settings.put({ name: "theme", value: theme }, "theme");
  };

  onMount(async () => {
    let dbTheme = await db.settings.get("theme");
    theme = dbTheme?.value ?? "light";
  });
</script>

<main class="popup-container" data-theme={theme}>
  <div class="max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
    <div
      class="grid grid-cols-1 gap-y-8 lg:items-center lg:gap-x-16"
    >
      <div class="flex flex-row">
        <span class="label-text flex-grow">Dark mode</span>
        <input
          type="checkbox"
          class="toggle toggle-success"
          on:change={async (event) => {
            await toggleTheme();
          }}
          checked={theme === "dark"}
        />
      </div>
    </div>
  </div>
</main>

<style>
  .popup-container {
    width: 480px;
    margin: 0 auto;
    border: 1px solid rgba(0, 0, 0, 0.03125) !important;
    box-shadow:
      0px 0.3px 0.9px rgb(0 0 0 / 10%),
      0px 1.6px 3.6px rgb(0 0 0 / 10%) !important;
  }
</style>
