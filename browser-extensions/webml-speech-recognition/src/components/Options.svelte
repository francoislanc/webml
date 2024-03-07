<script lang="ts">
    import LinkVariant from "~icons/mdi/link-variant";
    import Microphone from "~icons/mdi/microphone";
    import { ERROR_MIC_PERMISSION, MIC_ACCESS_GRANTED } from "../constants";
    import { reverse } from "dns";

    interface Log {
        text: string;
        created: Date;
    }

    let logs: Log[] = [];

    async function getMicrophonePermission() {
        return new Promise((resolve, reject) => {
            console.log("Getting user permission for microphone access...");

            // Using navigator.mediaDevices.getUserMedia to request microphone access
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                    // Permission granted, handle the stream if needed
                    console.log(MIC_ACCESS_GRANTED);
                    logs = [
                        ...logs,
                        {
                            created: new Date(),
                            text: MIC_ACCESS_GRANTED,
                        } as Log,
                    ];

                    resolve("MICROPHONE_PERMISSION_GRANTED");
                })
                .catch((error) => {
                    console.error(ERROR_MIC_PERMISSION, error);

                    let errorMsg = ERROR_MIC_PERMISSION;
                    if (error instanceof Error) {
                        errorMsg = `${ERROR_MIC_PERMISSION} (${error.message})`;
                    }

                    logs = [
                        ...logs,
                        { created: new Date(), text: errorMsg } as Log,
                    ];

                    // Handling different error scenarios
                    if (error.name === "Permission denied") {
                        reject("MICROPHONE_PERMISSION_DENIED");
                    } else {
                        reject(error);
                    }
                });
        });
    }
</script>

<div class="container">
    <div class="flex flex-col">
        <div class="flex justify-end pr-2 pb-2">
            <a href="https://webml.io" class="chip variant-soft">
                <span><LinkVariant /></span>
                <span>webml.io</span>
            </a>
        </div>

        <div class="flex flex-col gap-4">
            <div class="flex justify-center">
                <button
                    type="button"
                    class="btn variant-filled"
                    on:click={() => getMicrophonePermission()}
                >
                    <span><Microphone /></span>
                    <span>Check Microphone Permission</span>
                </button>
            </div>
            <section class="w-full max-h-[400px] p-4 overflow-y-auto space-y-4">
                {#each logs.reverse() as l}
                    <pre
                        class="pre">{l.created.toLocaleTimeString()} : {l.text}</pre>
                {/each}
            </section>
        </div>
    </div>
</div>

<style>
    .container {
        min-width: 450px;
    }
</style>
