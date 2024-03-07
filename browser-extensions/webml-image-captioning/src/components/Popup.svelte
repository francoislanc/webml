<script lang="ts">
    import { ImageSource, db } from "../db";
    import { Status } from "../db";
    import { liveQuery } from "dexie";
    import { AppBar, FileButton, ProgressBar } from "@skeletonlabs/skeleton";
    import Download from "~icons/mdi/download";
    import Microphone from "~icons/mdi/microphone";
    import Folder from "~icons/mdi/folder";
    import LinkVariant from "~icons/mdi/link-variant";
    import GoogleChrome from "~icons/mdi/google-chrome";
    import { onMount } from "svelte";

    import Delete from "~icons/mdi/delete";
    import { exportDB } from "dexie-export-import";

    import download from "downloadjs";
    import {
        ERROR_IMAGE_CAPTIONING_TIMEOUT,
        IMAGE_CAPTIONING_TIMEOUT_MS,
    } from "../constants";

    let transcriptions = liveQuery(() => db.images.reverse().toArray());
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

    $: decodingInProgress = liveQuery(async () => {
        const decodings = await db.images
            .where("status")
            .equals(Status.decoding)
            .count();
        return decodings > 0;
    });

    function objectUrl(imageBuffer: ArrayBuffer | undefined) {
        if (imageBuffer) {
            const blob = new Blob([imageBuffer], { type: "image/png" });
            return window.URL.createObjectURL(blob);
        }
        return "";
    }

    async function captureScreenshot() {
        const response = await chrome.runtime.sendMessage({
            cmd: "initCapture",
            target: "background",
        });
        window.close();
    }

    async function exportDb() {
        try {
            const blob = await exportDB(db, {
                prettyJson: true,
            });
            download(
                blob,
                "webml-image-captioning-export.json",
                "application/json",
            );
        } catch (error) {
            console.error("" + error);
        }
    }

    export const blobToData = (
        blob: Blob,
    ): Promise<string | ArrayBuffer | null> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsArrayBuffer(blob);
        });
    };

    async function createImage(title: string, data: ArrayBuffer) {
        try {
            // Add the new transcription!
            const id = await db.images.add({
                caption: "",
                tabTitle: title,
                status: Status.decoding,
                image: data,
                source: ImageSource.file,
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
                    let id = await createImage(file.name, data);

                    const response = await chrome.runtime.sendMessage({
                        target: "background",
                        type: "imageToDecode",
                        data: id,
                    });
                }
            }
        }
    }

    const truncate = (input: string) =>
        input.length > 40 ? `${input.substring(0, 40)}...` : input;

    async function deleteImage(id: number | undefined) {
        if (id) {
            await db.images.delete(id);
        }
    }

    onMount(() => {
        const interval = setInterval(async () => {
            const imageCaptioningTooLong = await db.images
                .where("status")
                .equals(Status.decoding)
                .and(
                    (item) =>
                        item.created <
                        new Date(Date.now() - IMAGE_CAPTIONING_TIMEOUT_MS),
                )
                .toArray();
            for (let i = 0; i < imageCaptioningTooLong.length; i++) {
                await db.images.update(imageCaptioningTooLong[i].id, {
                    caption: ERROR_IMAGE_CAPTIONING_TIMEOUT,
                    status: Status.failed,
                });
            }

        }, 5000);
        return () => {
            clearInterval(interval);
        };
    });
</script>

<div class="container mx-auto">
    <div class="flex flex-col h-full">
        <AppBar>
            <svelte:fragment slot="lead">
                <h2 class="h2 font-medium">
                    Image captioning
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
                        on:click={async () => await exportDb()}
                    >
                        <span><Download /></span>
                        <span>Export</span></button
                    >
                </div></svelte:fragment
            >
        </AppBar>
        <div class="flex mt-4 justify-center space-x-1">
            <button
                disabled={$decodingInProgress}
                on:click={async () => await captureScreenshot()}
                class=" btn variant-soft-primary"
            >
                <span>
                    <GoogleChrome />
                </span>
                <span>From tab</span>
            </button>

            <FileButton
                disabled={$decodingInProgress}
                button="btn variant-soft-primary"
                name="files"
                accept="image/png, image/jpeg"
                on:change={async (e) => {
                    await onFileChangeHandler(e);
                }}
                ><span>
                    <Folder />
                </span>
                <span>From file</span></FileButton
            >
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
                                        <h3 class="font-medium">
                                            {truncate(tr.tabTitle)}
                                        </h3>
                                        {#if tr.status === Status.decoded}
                                            {@const url = objectUrl(tr.image)}
                                            <div>
                                                <p class="text-justify">
                                                    {tr.caption}
                                                </p>
                                            </div>
                                            <div>
                                                <p class="text-justify">
                                                    <img
                                                        src={url}
                                                        alt={tr.tabTitle}
                                                    />
                                                </p>
                                            </div>
                                        {:else if tr.status === Status.decoding}
                                            {@const url = objectUrl(tr.image)}
                                            <label for="decoding"
                                                >Decoding ...</label
                                            >
                                            <ProgressBar />
                                            <div>
                                                <p class="text-justify">
                                                    <img
                                                        src={url}
                                                        alt={tr.tabTitle}
                                                    />
                                                </p>
                                            </div>
                                        {:else if tr.status === Status.failed}
                                            <p>{tr.caption}</p>
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
                                                {#if tr.status != Status.decoding}
                                                    <button
                                                        type="button"
                                                        class="btn-icon btn-icon-sm variant-soft"
                                                        on:click={async () =>
                                                            await deleteImage(
                                                                tr.id,
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
