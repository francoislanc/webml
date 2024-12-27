<script lang="ts">
  import { sendMessage } from "../../lib/messaging";
  import {
    createFileAudio,
    db,
    exportAudioDb,
    Status,
  } from "../../lib/db";
  import Icon from "@iconify/svelte";
  import logo from "../../assets/webml-speech-reco.svg";
  import Transcriptions from "../../lib/Transcriptions.svelte";
  import { liveQuery } from "dexie";
  import { blobToData } from "../../utils/dataConversion";
  import { i18n } from '#i18n';
  
  let theme: string;
  let inputFileField: any;

  let transcriptions = liveQuery(() => db.audios.reverse().toArray());

  let tabRecordingsInProgess = liveQuery(async () => {
    const recordings = await db.audios
      .where("status")
      .equals(Status.tab_recording)
      .count();
    return recordings > 0;
  });

  let micRecordingsInProgess = liveQuery(async () => {
    const recordings = await db.audios
      .where("status")
      .equals(Status.mic_recording)
      .count();
    return recordings > 0;
  });

  let transcriptionsInProgress = liveQuery(async () => {
    const transcribings = await db.audios
      .where("status")
      .equals(Status.transcribing)
      .count();
    return transcribings > 0;
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
        let data = await blobToData(file);
        inputFileField.value = "";
        if (data && data instanceof ArrayBuffer) {
          let id = await createFileAudio(file.name, data);

          await sendMessage("runAudioTranscription", id);
        }
      }
    }
  }

  async function record(withMic: boolean) {
    if (withMic) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const result = await sendMessage("startRecord", withMic);
      } catch (err) {
        browser.tabs.create({
            url: chrome.runtime.getURL("options.html"),
            active: true,
        });
      }
    } else {
      const result = await sendMessage("startRecord", withMic);
    }
  }

  async function toggleFunction(withMic: boolean) {
    let functionInProgress =
      $transcriptionsInProgress ||
      $tabRecordingsInProgess ||
      $micRecordingsInProgess;

    if (functionInProgress) {
      await sendMessage("stopRecord", undefined);
    } else {
        await record(withMic)
    }
  }
</script>

<main class="popup-container" data-theme={theme}>
  <div class="navbar bg-base-300">
    <div class="flex-1 space-x-4">
      <img src={logo} class="logo svelte" alt="Svelte Logo" width="50px" />
      <p class="text-xl">
        <a href="https://webml.io/" target="_blank">WebML</a> - {i18n.t('titleApp')}
      </p>
    </div>
    <div class="flex-none">
      <button
        class="btn btn-square btn-ghost btn-sm"
        on:click={async () => await exportAudioDb()}
      >
        <Icon icon="mdi:download" />
      </button>
    </div>
  </div>
  <div class="max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
    <div
      class="grid grid-cols-1 gap-y-8"
    >
      <div
        class="mx-auto max-w-lg text-center lg:mx-0 ltr:lg:text-left rtl:lg:text-right"
      >
        <div class="flex mt-4 justify-center space-x-1">
          <button
            disabled={$transcriptionsInProgress || $micRecordingsInProgess}
            on:click={async () => await toggleFunction(false)}
            class={$tabRecordingsInProgess ? " btn btn-active" : "btn"}
          >
            <span>
              <Icon icon="mdi:google-chrome" />
            </span>
            <span>From tab</span>
          </button>

          <input
            type="file"
            id="files"
            class="hidden"
            
            bind:this={inputFileField}
            on:change={async (e) => onFileChangeHandler(e)}
          />
          {#if $transcriptionsInProgress ||
            $tabRecordingsInProgess ||
            $micRecordingsInProgess}
            <label for="files" class="btn btn-disabled" 
              ><Icon icon="mdi:file" /> From file</label
            >
            {:else}
            <label for="files" class="btn"
            ><Icon icon="mdi:file" /> From file</label
          >
          {/if}
          <button
            disabled={$transcriptionsInProgress || $tabRecordingsInProgess}
            on:click={async () => await toggleFunction(true)}
            class={$micRecordingsInProgess ? " btn btn-active" : "btn"}
          >
            <span>
              <Icon icon="mdi:microphone" />
            </span>
            <span>From mic</span>

          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 justify-items-center">
        <Transcriptions
          deleteTranscription={async (id: number) => {
            await db.audios.delete(id);
          }}
          transcriptions={$transcriptions}
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
