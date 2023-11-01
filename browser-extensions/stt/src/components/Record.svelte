<script lang="ts">
    import isRecordingStore from "../storage";
    import { db } from "../db";
    import { liveQuery } from "dexie";

    async function addTranscription() {
        try {
            // Add the new transcription!
            const id = await db.audios.add({
                transcription: "Hello",
                status: "transcribed"
            });
        } catch (error) {
            console.log(`Failed to add : ${error}`);
        }
    }

    let transcriptions = liveQuery(() => db.audios.toArray());

    async function record() {
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
            target: "background",
        });
        if (response.responseCode == "start-recording") {
            isRecordingStore.set("true");
        } else {
            isRecordingStore.set("false");
        }
    }

    async function transcribeTestFile() {
        const response = await chrome.runtime.sendMessage({
            cmd: "transcribeTestFile",
            target: "background",
        });
    }
</script>

<div class="container">
    <div>
        <button on:click={async () => await record()}
            >{#if $isRecordingStore == "true"}
                <p>Stop recording</p>
            {:else}
                <p>Start recording</p>
            {/if}</button
        >

        <button on:click={async () => await transcribeTestFile()}>
            <p>Test file</p>
        </button>

        <button on:click={async () => await addTranscription()}>
            <p>Add transcription</p>
        </button>

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
