<script lang="ts">
    import { db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";

    let transcriptions = liveQuery(() => db.audios.reverse().toArray());
    /*let transcriptions = [
        {
            id: 1,
            audio: new ArrayBuffer(1024),
            tabTitle: "This is awesome title",
            transcription: "this is awesome transcription",
            status: Status.transcribed,
        },
    ];*/
    $: recordingsInProgess = liveQuery(async () => {
        const recordings = await db.audios
            .where("status")
            .equals(Status.recording)
            .count();
        return recordings;
    });

    $: transcriptionsInProgress = liveQuery(async () => {
        const transcribings = await db.audios
            .where("status")
            .equals(Status.transcribing)
            .count();
        return transcribings > 0;
    });

    function objectUrl(audioBuffer: ArrayBuffer | undefined) {
        if (audioBuffer) {
            const blob = new Blob([audioBuffer], { type: "audio/wav" });
            return window.URL.createObjectURL(blob);
        }
        return "";
    }

    async function record() {
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
            target: "background",
        });
    }
</script>

<div class="container">
    <div>
        <button
            disabled={$transcriptionsInProgress}
            on:click={async () => await record()}
            >{#if $recordingsInProgess > 0}
                <p>Stop recording</p>
            {:else}
                <p>Start recording</p>
            {/if}</button
        >

        {#if $transcriptions}
            <ul>
                {#each $transcriptions as tr (tr.id)}
                    <li>
                        <b>{tr.tabTitle}</b>
                        {#if tr.status === Status.transcribed}
                            {@const url = objectUrl(tr.audio)}
                            <p>{tr.transcription}</p>
                            <audio controls>
                                <source src={url} type="audio/wav" />
                                Your browser does not support the audio element.
                            </audio>
                        {:else if tr.status === Status.transcribing}
                            <label for="transcribing">Transcribing ...</label>
                            <progress id="transcribing" />
                        {:else if tr.status === Status.recording}
                            <label for="recording">Recording ...</label>
                            <progress />
                        {:else if tr.status === Status.transcription_failed}
                            <p>X</p>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>

<style>
    .container {
        min-width: 450px;
    }
</style>
