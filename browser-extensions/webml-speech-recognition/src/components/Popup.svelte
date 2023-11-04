<script lang="ts">
    import { db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";
    import { AppBar, FileButton, ProgressBar } from "@skeletonlabs/skeleton";
    import Download from "~icons/mdi/download";
    import Microphone from "~icons/mdi/microphone";
    import Folder from "~icons/mdi/folder";
    import LinkVariant from "~icons/mdi/link-variant";
    import GoogleChrome from "~icons/mdi/google-chrome";

    import Delete from "~icons/mdi/delete";
    import { exportDB } from "dexie-export-import";
    // @ts-ignore
    import download from "downloadjs";

    let transcriptions = liveQuery(() => db.audios.reverse().toArray());
    /*let transcriptions = [
        {
            id: 1,
            audio: new ArrayBuffer(1024),
            tabTitle:
                "This is awesome title. This is awesome title. This is awesome title. This is awesome title. This is awesome title. ",
            transcription:
                "this is awesome transcription. this is awesome transcription. this is awesome transcription. this is awesome transcription. this is awesome transcription.",
            status: Status.transcribed,
        }
    ];*/
    $: recordingsInProgess = liveQuery(async () => {
        const recordings = await db.audios
            .where("status")
            .equals(Status.recording)
            .count();
        return recordings > 0;
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
                "webml-speech-recognition-export.json",
                "application/json"
            );
        } catch (error) {
            console.error("" + error);
        }
    }

    function onFileChangeHandler(e: Event): void {
        console.log("file data:", e);
    }
</script>

<div class="container mx-auto">
    <div class="flex flex-col h-full">
        <AppBar>
            <svelte:fragment slot="lead">
                <h2 class="h2">Speech recognition</h2></svelte:fragment
            >

            <svelte:fragment slot="trail"
                ><div class="flex flex-col space-y-1">
                    <a
                        href="https://webml.io"
                        target="_blank"
                        class="chip variant-soft"
                    >
                        <span><LinkVariant /></span>
                        <span>webml.io</span>
                    </a><button
                        class="chip variant-soft"
                        on:click={async () => await exportAudioDb()}
                    >
                        <span><Download /></span>
                        <span>Export</span></button
                    >
                </div></svelte:fragment
            >
        </AppBar>
        <div class="grid grid-cols-2 pt-2 space-y-2 justify-items-center">
            <div>
                <button
                    class="btn variant-filled mt-2"
                    disabled={$transcriptionsInProgress}
                    on:click={async () => await record()}
                    >{#if $recordingsInProgess}
                        <span>
                            <GoogleChrome style="color: #84cc16" />
                        </span>
                        <span>From tab</span>
                    {:else}
                        <span>
                            <GoogleChrome />
                        </span>
                        <span>From tab</span>
                    {/if}
                </button>
            </div>
            <div>
                <button
                    class="btn variant-filled"
                    disabled={$transcriptionsInProgress || $recordingsInProgess}
                    on:click={async () => await record()}
                    ><span>
                        <LinkVariant />
                    </span>
                    <span>From URL</span></button
                >
            </div>
            <div>
                <FileButton
                    disabled={$transcriptionsInProgress || $recordingsInProgess}
                    button="btn variant-filled"
                    name="files"
                    accept="audio/wav"
                    on:change={onFileChangeHandler}
                    ><span>
                        <Folder />
                    </span>
                    <span>From file</span></FileButton
                >
            </div>
            <div>
                <button
                    class="btn variant-filled"
                    disabled={$transcriptionsInProgress || $recordingsInProgess}
                    on:click={async () => await record()}
                    ><span>
                        <Microphone />
                    </span>
                    <span>From mic</span></button
                >
            </div>
        </div>
        <hr class="opacity-50 my-4" />
        <!--<div class="justify-center mt-4 mb-4">
            
        </div>-->
        <div class="overflow-y-auto">
            {#if $transcriptions}
                <ul class="list space-y-4">
                    {#each $transcriptions as tr (tr.id)}
                        <li>
                            <div class="flex">
                                <div class="mx-4 card">
                                    <section
                                        class="flex flex-col space-y-4 p-4"
                                    >
                                        <h4 class="h4 text-justify">
                                            {tr.tabTitle}
                                        </h4>
                                        {#if tr.status === Status.transcribed}
                                            {@const url = objectUrl(tr.audio)}
                                            <div>
                                                <p class="text-justify">
                                                    {tr.transcription}
                                                </p>
                                            </div>
                                            <div>
                                                <audio
                                                    controls
                                                    style="width: 100%;"
                                                >
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
                                    </section>
                                    <hr class="opacity-50" />
                                    <footer class="card-footer p-4">
                                        <div class="flex justify-between">
                                            <div>
                                                <p>
                                                    Date: 11/12/2023<br />Type:
                                                    URL
                                                </p>
                                            </div>
                                            <div>
                                                {#if tr.status != Status.transcribing && tr.status != Status.recording}
                                                <button
                                                    type="button"
                                                    class="btn-icon btn-icon-sm variant-soft"
                                                    on:click={async () =>
                                                        await deleteTranscription(
                                                            tr.id
                                                        )}><Delete /></button
                                                >
                                                {/if}
                                            </div>
                                        </div>
                                    </footer>
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
        width: 400px;
        height: 600px;
    }
</style>
