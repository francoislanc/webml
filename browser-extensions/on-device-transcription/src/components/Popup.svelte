<script lang="ts">
    import { db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";
    import { AppBar, ProgressBar } from "@skeletonlabs/skeleton";
    import LinkVariant from "~icons/mdi/link-variant";
    import Download from "~icons/mdi/download";
    import Waveform from "~icons/mdi/waveform";
    import Delete from "~icons/mdi/delete";
    import {
        exportDB,
    } from "dexie-export-import";
    // @ts-ignore
    import download from "downloadjs";

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
        //@ts-ignore
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
            target: "background",
        });
    }

    async function deleteTranscription(id: number | undefined) {
        if (id) {
            await db.audios.delete(id);
        }
    }

    async function exportAudioDb() {
        try {
            const blob = await exportDB(db, {
                prettyJson: true,
            });
            download(
                blob,
                "on-device-transcription-export.json",
                "application/json"
            );
        } catch (error) {
            console.error("" + error);
        }
    }
</script>

<div class="container">
    <div class="flex flex-col min-h-screen max-h-screen w-full">
        <AppBar>
            <svelte:fragment slot="lead"
                ><h2 class="h2">On-device transcription</h2></svelte:fragment
            >

            <svelte:fragment slot="trail"
                ><a href="https://webml.io" target="_blank" class="chip variant-soft">
                    <span><LinkVariant /></span>
                    <span>webml.io</span>
                </a></svelte:fragment
            >
        </AppBar>
        <div class="flex justify-around p-4">
            <button
                type="button"
                class="btn-icon variant-filled"
                disabled={$transcriptionsInProgress}
                on:click={async () => await record()}
                >{#if $recordingsInProgess > 0}
                    <Waveform style="font-size: 2em; color: #84cc16" />
                {:else}
                    <Waveform style="font-size: 2em;" />
                {/if}
            </button>
            <button
                type="button"
                class="btn-icon variant-filled"
                on:click={async () => await exportAudioDb()}
                ><Download /></button
            >
        </div>
        <div class="overflow-y-auto">
            {#if $transcriptions}
                <ul class="list">
                    {#each $transcriptions as tr (tr.id)}
                        <li>
                            <div class="flex w-full">
                                <div class="flex card my-1 mx-2 p-4 w-full">
                                    <div class="flex flex-col w-full space-y-4">
                                        <div class="flex justify-between">
                                            <b class="text-justify"
                                                >{tr.tabTitle}</b
                                            >
                                            <div class="ml-6">
                                                <button
                                                    type="button"
                                                    class="btn-icon btn-icon-sm variant-soft"
                                                    on:click={async () =>
                                                        await deleteTranscription(
                                                            tr.id
                                                        )}><Delete /></button
                                                >
                                            </div>
                                        </div>
                                        {#if tr.status === Status.transcribed}
                                            {@const url = objectUrl(tr.audio)}
                                            <div>
                                                <p class="text-justify">
                                                    {tr.transcription}
                                                </p>
                                            </div>
                                            <div>
                                                <audio controls>
                                                    <source
                                                        src={url}
                                                        type="audio/wav"
                                                    />
                                                    Your browser does not support
                                                    the audio element.
                                                </audio>
                                            </div>
                                        {:else if tr.status === Status.transcribing}
                                            <label for="transcribing"
                                                >Transcribing ...</label
                                            >
                                            <ProgressBar />
                                        {:else if tr.status === Status.recording}
                                            <label for="recording"
                                                >Recording ...</label
                                            >
                                            <ProgressBar />
                                        {:else if tr.status === Status.transcription_failed}
                                            <p>X</p>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>

<style>
    .container {
        min-width: 450px;
        min-height: 600px;
    }
</style>
