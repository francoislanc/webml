
<script>
    import { onMount } from "svelte";

	onMount(() => {
		let audio = document.getElementById("myaudio");
		if (audio) {
  			audio.volume = 0.2;
		}
	})
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
					Test audio
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
            <figure>
                <figcaption>Listen to the audio:</figcaption>
                <audio controls id="myaudio" src="https://huggingface.co/datasets/Narsil/candle-examples/resolve/main/samples_jfk.wav">
                  <a href="https://huggingface.co/datasets/Narsil/candle-examples/resolve/main/samples_jfk.wav"> Download audio </a>
                </audio>
              </figure>
			</div>
		</form>
	</div>
</div>
