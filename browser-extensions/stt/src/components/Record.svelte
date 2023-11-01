<script lang="ts">
    import { db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";

    let transcriptions = liveQuery(() => db.audios.toArray());
    $: recordingsInProgess = liveQuery(async () => {
        const recordings = await db.audios.where("status").equals(Status.recording).count();
        return recordings;
    });

    $: transcriptionsInProgress = liveQuery(async () => {
        const transcribings = await db.audios.where("status").equals(Status.transcribing).count();
        return transcribings > 0;
    });

    async function record() {
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
            target: "background",
        });
    }
</script>

<div class="container">
    <div>
        <button on:click={async () => await record()}
            >{#if $recordingsInProgess > 0}
                <p>Stop recording</p>
            {:else}
                <p>Start recording</p>
            {/if}</button
        >

        {#if $transcriptions}
            {#each $transcriptions as tr (tr.id)}
                <li>{tr.transcription}</li>
            {/each}
        {/if}
    </div>
</div>

<style>
    .container {
        min-width: 250px;
    }

    button {
        border-radius: 2px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        background-color: #2ecc71;
        color: #ecf0f1;
        transition: background-color 0.3s;
        padding: 5px 10px;
        border: none;
    }

    button:hover,
    button:focus {
        background-color: #27ae60;
    }
</style>
