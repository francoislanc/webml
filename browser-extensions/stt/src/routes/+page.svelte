<script lang="ts">
	// Svelte
	import { onMount } from "svelte";
	import { scale } from "svelte/transition";
	import WhisperWorker from "$lib/whisperWorker?worker";
	import isRecording from "$lib/stores/stt";
	import {
		modelURL,
		modelID,
		tokenizerURL,
		configURL,
		mel_filtersURL,
		audioURL,
	} from "$lib/params";

	// Libs
	// import init, { add } from "$lib/pkg/my_package";
	// @ts-ignore
	import { Confetti } from "svelte-confetti";

	// Variables
	let runMade: boolean = false;
	let whisperWorker: Worker;

	onMount(async () => {
		whisperWorker = new WhisperWorker();

		/*chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			console.log("onMessage popup");
			console.log(request);
			return true;
		});*/
	});

	async function classifyAudio(
		weightsURL, // URL to the weights file
		modelID, // model ID
		tokenizerURL, // URL to the tokenizer file
		configURL, // model config URL
		mel_filtersURL, // URL to the mel filters file
		audioURL // URL to the audio file
	) {
		console.log("classify audio");
		return new Promise((resolve, reject) => {
			console.log("execute post message");
			console.log(whisperWorker);
			whisperWorker.postMessage({
				weightsURL,
				modelID,
				tokenizerURL,
				configURL,
				mel_filtersURL,
				audioURL,
			});
			function messageHandler(event) {
				console.log(event.data);
				if ("error" in event.data) {
					whisperWorker.removeEventListener(
						"message",
						messageHandler
					);
					reject(new Error(event.data.error));
				}
				if (event.data.status === "complete") {
					whisperWorker.removeEventListener(
						"message",
						messageHandler
					);
					resolve(event.data);
				}
			}
			whisperWorker.addEventListener("message", messageHandler);
		});
	}

	async function handleClick2(): void {
		const response = await chrome.runtime.sendMessage({
			cmd: "toggleRecording",
		});
		if (response.responseCode == "start-recording") {
			isRecording.set("true");
		} else {
			isRecording.set("false");
		}
	}
	function handleClick(): void {
		runMade = true;

		classifyAudio(
			modelURL,
			modelID,
			tokenizerURL,
			configURL,
			mel_filtersURL,
			audioURL
		)
			.then((result) => {
				console.log("RESULT", result);
			})
			.catch((error) => {
				console.error(error);
			});
		// result = add(numberA, numberB);
	}
</script>

<div class="flex px-4 w-full h-screen items-center justify-center flex-col">
	<!--Card-->
	<div
		class="relative flex flex-col justify-center items-center rounded-lg p-6 border border-slate-200 shadow-sm bg-white"
	>
		<!--Title container-->
		<div class="flex flow-row justify-center items-center space-x-3">
			<div class="flex flex-col justify-center items-start w-full">
				<h1 class="font-medium text-lg text-slate-950">
					On-Device Speech-To-Text in a browser
				</h1>
			</div>
		</div>
		<!--Form container-->
		<form
			class="flex flex-col w-full justify-center space-y-6 mt-6 items-center"
		>
			<!--Inputs-->
			<div
				class="flex flex-col w-full justify-center space-y-3 items-center"
			>
				<button
					on:click|preventDefault={handleClick}
					class="py-3 shadow rounded-md bg-gradient-to-b from-teal-500 to-teal-600 text-white w-full font-medium"
				>
					<p>Run</p>
				</button>
				<button
					on:click|preventDefault={async () => await handleClick2()}
					class="py-3 shadow rounded-md bg-gradient-to-b from-teal-500 to-teal-600 text-white w-full font-medium"
				>
					{#if $isRecording == "true"}
						<p>Stop recording</p>
					{:else}
						<p>Start recording</p>
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
