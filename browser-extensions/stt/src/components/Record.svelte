<script lang="ts">
    import { db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";
    import { ProgressBar } from "@skeletonlabs/skeleton";
    import LinkVariant from '~icons/mdi/link-variant';
    import RecordRec from '~icons/mdi/record-rec';
    import Microphone from '~icons/mdi/microphone';
    import Download from '~icons/mdi/download';

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
    <div class="flex justify-around p-4">
        <button
            type="button"
            class="btn-icon variant-filled-primary"
            disabled={$transcriptionsInProgress}
            on:click={async () => await record()}
            >{#if $recordingsInProgess > 0}
                <RecordRec style="font-size: 2em; color: red"/>
            {:else}
                <RecordRec style="font-size: 2em;"/>
            {/if}
        </button>
        <button type="button" class="btn-icon variant-filled-primary"><Microphone /></button>
        <button type="button" class="btn-icon variant-filled-primary"><Download /></button>
    </div>
    <div class="flex justify-end pr-2 pb-2">
        <a href="https://webml.io" class="chip variant-soft">
            <span><LinkVariant /></span>
           <span>webml.io</span>
        </a>
    </div>
    {#if $transcriptions}
        <ul class="list">
            {#each $transcriptions as tr (tr.id)}
                <li>
                    <div class="flex w-full">
                        <div class="card p-4 w-full">
                            <b>{tr.tabTitle}</b>
                            {#if tr.status === Status.transcribed}
                                {@const url = objectUrl(tr.audio)}
                                <p>{tr.transcription}</p>
                                <audio controls>
                                    <source src={url} type="audio/wav" />
                                    Your browser does not support the audio element.
                                </audio>
                            {:else if tr.status === Status.transcribing}
                                <label for="transcribing"
                                    >Transcribing ...</label
                                >
                                <ProgressBar />
                            {:else if tr.status === Status.recording}
                                <label for="recording">Recording ...</label>
                                <ProgressBar />
                            {:else if tr.status === Status.transcription_failed}
                                <p>X</p>
                            {/if}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .container {
        min-width: 450px;
    }
</style>
