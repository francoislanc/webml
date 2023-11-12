<script lang="ts">
    import { AudioSource, db } from "../db";
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
    $: tabRecordingsInProgess = liveQuery(async () => {
        const recordings = await db.audios
            .where("status")
            .equals(Status.tab_recording)
            .count();
        return recordings > 0;
    });

    $: micRecordingsInProgess = liveQuery(async () => {
        const recordings = await db.audios
            .where("status")
            .equals(Status.mic_recording)
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

    async function record(with_mic: boolean) {
        if (with_mic) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.log(err);
                console.error(err);
            }
        }
        //@ts-ignore
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
            data: with_mic,
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

    export const blobToData = (
        blob: Blob
    ): Promise<string | ArrayBuffer | null> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsArrayBuffer(blob);
        });
    };

    async function createFileAudio(title: string, data: ArrayBuffer) {
        try {
            // Add the new transcription!
            const id = await db.audios.add({
                transcription: "",
                tabTitle: title,
                status: Status.transcribing,
                audio: data,
                source: AudioSource.file,
                created: new Date(),
            });
            return id;
        } catch (error) {
            console.log(`Failed to add : ${error}`);
        }
    }

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
                if (data && data instanceof ArrayBuffer) {
                    let id = await createFileAudio(file.name, data);

                    // @ts-ignore
                    const response = await chrome.runtime.sendMessage({
                        target: "background",
                        type: "audioWav",
                        data: id,
                    });
                }
            }
        }
    }

    const truncate = (input: string) =>
        input.length > 40 ? `${input.substring(0, 40)}...` : input;

    const cleanTranscription = (input: string) => {
        const regex = /<\|([0-9]*[.])?[0-9]+\|>/g;
        const regex2 = /^\. /g;

        let output = input.replaceAll(regex, "").replaceAll(regex2, "");
        return output;
    };
</script>

<div class="container mx-auto">
    <div class="flex flex-col h-full">
        <AppBar>
            <svelte:fragment slot="lead">
                <h2 class="h2 font-medium">
                    Speech recognition
                </h2></svelte:fragment
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
        <div class="flex mt-4 justify-center space-x-1">
            {#if $tabRecordingsInProgess}
                <button
                    disabled={$transcriptionsInProgress ||
                        $micRecordingsInProgess}
                    on:click={async () => await record(false)}
                    class=" btn variant-filled-primary"
                >
                    <span>
                        <GoogleChrome />
                    </span>
                    <span>From tab</span>
                </button>
            {:else}
                <button
                    class=" btn variant-soft-primary"
                    disabled={$transcriptionsInProgress ||
                        $micRecordingsInProgess}
                    on:click={async () => await record(false)}
                >
                    <span>
                        <GoogleChrome />
                    </span>
                    <span>From tab</span>
                </button>
            {/if}

            <FileButton
                disabled={$transcriptionsInProgress ||
                    $tabRecordingsInProgess ||
                    $micRecordingsInProgess}
                button="btn variant-soft-primary"
                name="files"
                accept="audio/wav"
                on:change={async (e) => {
                    await onFileChangeHandler(e);
                }}
                ><span>
                    <Folder />
                </span>
                <span>From file</span></FileButton
            >

            {#if $micRecordingsInProgess}
                <button
                    disabled={$transcriptionsInProgress ||
                        $tabRecordingsInProgess}
                    class="btn variant-filled-primary"
                    on:click={async () => await record(true)}
                >
                    <span>
                        <Microphone />
                    </span>
                    <span>From mic</span></button
                >
            {:else}
                <button
                    disabled={$transcriptionsInProgress ||
                        $tabRecordingsInProgess}
                    class="btn variant-soft-primary"
                    on:click={async () => await record(true)}
                >
                    <span>
                        <Microphone />
                    </span>
                    <span>From mic</span></button
                >
            {/if}
        </div>
        <hr class="opacity-50 my-4" />
        <div class="overflow-y-auto">
            {#if $transcriptions}
                <ul class="list space-y-4">
                    {#each $transcriptions as tr (tr.id)}
                        <li>
                            <div class="flex w-full">
                                <div class="mx-4 card w-full">
                                    <section
                                        class="flex flex-col space-y-4 p-4"
                                    >
                                        {#if tr.source != AudioSource.microphone}
                                            <h3 class="font-medium">
                                                {truncate(tr.tabTitle)}
                                            </h3>
                                        {/if}
                                        {#if tr.status === Status.transcribed}
                                            {@const url = objectUrl(tr.audio)}
                                            <div>
                                                <p class="text-justify">
                                                    {cleanTranscription(
                                                        tr.transcription
                                                    )}
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
                                        {:else if tr.status === Status.tab_recording || tr.status === Status.mic_recording}
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
                                                    <span
                                                        class="badge variant-soft"
                                                        >{tr.created.toLocaleDateString()}</span
                                                    >
                                                    <span
                                                        class="badge variant-soft"
                                                        >{tr.source}</span
                                                    >
                                                </p>
                                            </div>
                                            <div>
                                                {#if tr.status != Status.transcribing && tr.status != Status.tab_recording && tr.status != Status.mic_recording}
                                                    <button
                                                        type="button"
                                                        class="btn-icon btn-icon-sm variant-soft"
                                                        on:click={async () =>
                                                            await deleteTranscription(
                                                                tr.id
                                                            )}
                                                        ><Delete /></button
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
        width: 450px;
        height: 600px;
    }
</style>
