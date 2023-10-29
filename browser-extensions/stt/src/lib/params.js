export const tiny_quantized_multilingual_q80 = {
    base_url: "https://huggingface.co/lmz/candle-whisper/resolve/main/",
    model: "model-tiny-q80.gguf",
    tokenizer: "tokenizer-tiny.json",
    config: "config-tiny.json",
};
export const modelID = "tiny_quantized_multilingual_q80";
export const model = tiny_quantized_multilingual_q80.model;
export const modelURL = tiny_quantized_multilingual_q80.base_url + model;
export const tokenizerURL =
    tiny_quantized_multilingual_q80.base_url +
    tiny_quantized_multilingual_q80.tokenizer;
export const configURL =
    tiny_quantized_multilingual_q80.base_url +
    tiny_quantized_multilingual_q80.config;

export let audioURL =
    "https://huggingface.co/datasets/Narsil/candle-examples/resolve/main/samples_jfk.wav";
export let mel_filtersURL =
    " https://huggingface.co/spaces/lmz/candle-whisper/resolve/main/mel_filters.safetensors";