import {
  pipeline,
  env,
  full,
  RawImage,
  AutoProcessor,
} from "@huggingface/transformers";

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
  static task = "image-to-text";
  static model = "Xenova/vit-gpt2-image-captioning";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

class AutoProcessorSingleton {
  static model = "Xenova/vit-gpt2-image-captioning";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await AutoProcessor.from_pretrained(this.model, {});
    }

    return this.instance;
  }
}

export const initModelDummy = async () => {
  let pipeline = await PipelineSingleton.getInstance((data) => {});

  // Run model with dummy input to compile shaders
  if (pipeline) {
    await pipeline.model.generate({
      pixel_values: full([1, 3, 224, 224], 0.0),
      max_new_tokens: 1,
    });
  }
};

// Create generic classify function, which will be reused for the different types of events.
export const runModel = async (image) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await PipelineSingleton.getInstance((data) => {
    // You can track the progress of the pipeline creation here.
    // e.g., you can send `data` back to the UI to indicate a progress bar
    //    console.log('progress', data)
  });

  // console.log(res)

  // Actually run the model on the input text
  let result = await model(image, {
    max_new_tokens: 20,
    num_beams: 2,
    num_return_sequences: 2,
    top_k: 0,
    do_sample: false,
  });
  return result[0]["generated_text"];
};
