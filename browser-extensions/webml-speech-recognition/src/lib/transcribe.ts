import {
  pipeline,
  env,
  full,
  ProgressCallback,
} from "@huggingface/transformers";
import { WaveFile } from "wavefile";

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

export class PipelineSingleton {
  static task = "automatic-speech-recognition";
  static model = "onnx-community/whisper-tiny_timestamped";
  static instance = null;

  static async getInstance(progress_callback?: ProgressCallback) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

export const initModelDummy = async () => {
  let pipeline = await PipelineSingleton.getInstance((data) => {});

  // Run model with dummy input to compile shaders
  if (pipeline) {
    await pipeline.model.generate({
      input_features: full([1, 80, 3000], 0.0),
      max_new_tokens: 1,
    });
  }
};

// Create generic classify function, which will be reused for the different types of events.
export const transcribe = async (arrayBuffer) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await PipelineSingleton.getInstance((data) => {
    // You can track the progress of the pipeline creation here.
    // e.g., you can send `data` back to the UI to indicate a progress bar
    //    console.log('progress', data)
  });

  // Read .wav file and convert it to required format
  let wav = new WaveFile();
  const bytes = new Uint8Array(arrayBuffer);
  wav.fromBuffer(bytes);
  wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
  wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
  let audioData = wav.getSamples();
  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);

      // Merge channels (into first channel to save memory)
      for (let i = 0; i < audioData[0].length; ++i) {
        audioData[0][i] =
          (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
      }
    }

    // Select first channel
    audioData = audioData[0];
  }

  // Actually run the model on the input text
  let result = await model(audioData);
  return result;
};
