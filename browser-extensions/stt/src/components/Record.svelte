<script lang="ts">
    import isRecordingStore from "../storage";

    async function record() {
        const response = await chrome.runtime.sendMessage({
            cmd: "toggleRecording",
        });
        if (response.responseCode == "start-recording") {
            isRecordingStore.set("true");
        } else {
            isRecordingStore.set("false");
        }
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
