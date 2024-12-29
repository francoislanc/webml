<script lang="ts">
  import { sendMessage } from "../../lib/messaging";
  import { createImage, db, exportAppDb, Status } from "../../lib/db";
  import logo from "../../assets/webml-image-captioning.svg";
  import Captions from "../../lib/Captions.svelte";
  import { liveQuery } from "dexie";
  import { i18n } from "#i18n";
  import { RawImage } from "@huggingface/transformers";

  let theme: string;
  let inputFileField: any;

  let captions = liveQuery(() => db.images.reverse().toArray());

  $: decodingInProgress = liveQuery(async () => {
    const decodings = await db.images
      .where("status")
      .equals(Status.decoding)
      .count();
    return decodings > 0;
  });

  onMount(async () => {
    let dbTheme = await db.settings.get("theme");
    theme = dbTheme?.value ?? "light";
  });

  async function onFileChangeHandler(e: Event): Promise<void> {
    if (e != null && e.target != null) {
      let htmlInputElement = e.target as HTMLInputElement;
      if (
        htmlInputElement &&
        htmlInputElement.files &&
        htmlInputElement.files.length > 0
      ) {
        let file = htmlInputElement.files[0];
        let image = await RawImage.fromBlob(file);
        let imageBlob = await image.toBlob()
        let arrayBuffer = await imageBlob.arrayBuffer()
        inputFileField.value = "";
        let resizedImage = await image.resize(224, 224, {resample: 2})

        let id = await createImage(file.name, resizedImage, arrayBuffer);
        await sendMessage("imageToDecode", id);
      }
    }
  }

  async function toggleFunction() {
    await sendMessage("initCapture", undefined);
    window.close();
  }
  
</script>

<main class="popup-container" data-theme={theme}>
  <div class="navbar bg-base-300">
    <div class="flex-1 space-x-4">
      <img src={logo} class="logo svelte" alt="Svelte Logo" width="50px" />
      <p class="text-xl">
        <a href="https://webml.io/" target="_blank">WebML</a> - {i18n.t(
          "titleApp"
        )}
      </p>
    </div>
    <div class="flex-none">
      <button
        aria-label="Download"
        class="btn btn-square btn-ghost btn-sm"
        on:click={async () => await exportAppDb()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          ><path
            fill="currentColor"
            d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7z"
          /></svg
        >
      </button>
    </div>
  </div>
  <div class="max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
    <div class="grid grid-cols-1 gap-y-8">
      <div
        class="mx-auto max-w-lg text-center lg:mx-0 ltr:lg:text-left rtl:lg:text-right"
      >
        <div class="flex mt-4 justify-center space-x-1">
          <button
            disabled={$decodingInProgress}
            on:click={async () => await toggleFunction()}
            class="btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              ><path
                fill="currentColor"
                d="m12 20l3.46-6h-.01c.34-.6.55-1.27.55-2c0-1.2-.54-2.27-1.38-3h4.79c.38.93.59 1.94.59 3a8 8 0 0 1-8 8m-8-8c0-1.46.39-2.82 1.07-4l3.47 6h.01c.69 1.19 1.95 2 3.45 2c.45 0 .88-.09 1.29-.23l-2.4 4.14C7 19.37 4 16.04 4 12m11 0a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3a3 3 0 0 1 3 3m-3-8a7.98 7.98 0 0 1 6.92 4H12c-1.94 0-3.55 1.38-3.92 3.21L5.7 7.08A7.98 7.98 0 0 1 12 4m0-2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"
              /></svg
            >
            <span>From tab</span>
          </button>

          <input
            type="file"
            id="files"
            class="hidden"
            accept="image/png, image/jpeg, image/webp"
            bind:this={inputFileField}
            on:change={async (e) => onFileChangeHandler(e)}
          />
          {#if $decodingInProgress}
            <label for="files" class="btn btn-disabled"
              ><svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                ><path
                  fill="currentColor"
                  d="M13 9V3.5L18.5 9M6 2c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                /></svg
              > From file</label
            >
          {:else}
            <label for="files" class="btn"
              ><svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                ><path
                  fill="currentColor"
                  d="M13 9V3.5L18.5 9M6 2c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                /></svg
              > From file</label
            >
          {/if}
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 justify-items-center">
        <Captions
          deleteCaption={async (id: number) => {
            await db.images.delete(id);
          }}
          captions={$captions}
        />
      </div>
    </div>
  </div>
</main>

<style>
  .popup-container {
    width: 480px;
    margin: 0 auto;
    box-shadow:
      0px 0.3px 0.9px rgb(0 0 0 / 10%),
      0px 1.6px 3.6px rgb(0 0 0 / 10%) !important;
  }
</style>
