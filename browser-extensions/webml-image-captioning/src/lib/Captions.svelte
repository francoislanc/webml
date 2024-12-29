<script lang="ts">
  import { Status } from "./db";
  let { deleteCaption, captions } = $props();

  const truncate = (input: string) =>
    input.length > 37 ? `${input.substring(0, 37)}...` : input;

  const cleanText = (input: string) => {
    const regex = /<\|([0-9]*[.])?[0-9]+\|>/g;
    const regex2 = /^\. /g;

    let output = input.replaceAll(regex, "").replaceAll(regex2, "");
    return output;
  };



  function objectUrl(imageBuffer: ArrayBuffer | undefined) {
        if (imageBuffer) {
            const blob = new Blob([imageBuffer], { type: "image/png" });
            return window.URL.createObjectURL(blob);
        }
        return "";
    }

</script>

{#each captions as tr (tr.id)}
  {@const url = objectUrl(tr.image)}
  <div class="card card-side bg-base-200 w-11/12 shadow-md">
    <figure class="pl-4 max-w-44">
      <img class="rounded-lg" src={url} alt="img to caption" />
    </figure>
    <div class="card-body">
      {#if tr.status === Status.decoded || tr.status === Status.failed}
        <div class="card-actions justify-end">
          <button
            aria-label="Delete"
            class="btn btn-square btn-xs"
            onclick={async () => await deleteCaption(tr.id)}
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
        {cleanText(truncate(tr.tabTitle))}
      </h2>
      {#if tr.status === Status.decoded}
        <p class="text-base">
          {cleanText(tr.caption)}
        </p>
      {:else if tr.status === Status.decoding}
        <div class="flex flex-row space-x-1">
          <p class="flex-none text-base">Decoding</p>
          <span class="loading loading-dots loading-sm"></span>
        </div>
      {:else if tr.status === Status.failed}
        <p class="text-base">{tr.caption}</p>
      {/if}

      <div class="pt-4 card-actions justify-end items-center">
        <div class="badge badge-outline">{tr.created.toLocaleDateString()}</div>
        <div class="badge badge-outline">{tr.source}</div>
      </div>
    </div>
  </div>
{/each}
