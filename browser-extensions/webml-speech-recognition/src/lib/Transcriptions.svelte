<script lang="ts">
  import { AudioSource, Status } from "./db";
  let { deleteTranscription, transcriptions } = $props();

  const truncate = (input: string) =>
    input.length > 37 ? `${input.substring(0, 37)}...` : input;

  const cleanTranscription = (input: string) => {
    const regex = /<\|([0-9]*[.])?[0-9]+\|>/g;
    const regex2 = /^\. /g;

    let output = input.replaceAll(regex, "").replaceAll(regex2, "");
    return output;
  };

  function objectUrl(audioBuffer: ArrayBuffer | undefined) {
    if (audioBuffer) {
      const blob = new Blob([audioBuffer], { type: "audio/wav" });
      return window.URL.createObjectURL(blob);
    }
    return "";
  }
</script>

{#each transcriptions as tr (tr.id)}
  <div class="card bg-base-200 w-11/12 shadow-md">
    <div class="card-body">
      {#if tr.status === Status.transcribed || tr.status === Status.transcription_failed}
        <div class="card-actions justify-end">
          <button
            aria-label="Delete"
            class="btn btn-square btn-xs"
            onclick={async () => await deleteTranscription(tr.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      {/if}
      <h2 class="text-lg">
        {#if tr.source != AudioSource.microphone}
          {cleanTranscription(truncate(tr.tabTitle))}
        {/if}
      </h2>
      {#if tr.status === Status.transcribed}
        {@const url = objectUrl(tr.audio)}
        <p class="text-base">
          {cleanTranscription(tr.transcription)}
        </p>
        <div>
          <audio controls style="width: 100%;">
            <source src={url} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      {:else if tr.status === Status.transcribing}
        <div class="flex flex-row space-x-1">
          <p class="flex-none text-base">Transcribing</p>
          <span class="loading loading-dots loading-sm"></span>
        </div>
      {:else if tr.status === Status.tab_recording || tr.status === Status.mic_recording}
        <div class="flex flex-row space-x-1">
          <p class="flex-none text-base">Recording</p>
          <span class="loading loading-dots loading-sm"></span>
        </div>
      {:else if tr.status === Status.transcription_failed}
        <p class="text-base">{tr.transcription}</p>
      {/if}

      <div class="pt-4 card-actions justify-end items-center">
        <div class="badge badge-outline">{tr.created.toLocaleDateString()}</div>
        <div class="badge badge-outline">{tr.source}</div>
      </div>
    </div>
  </div>
{/each}
