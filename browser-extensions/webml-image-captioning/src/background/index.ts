import init, { Decoder } from "../webml/whisper";
import { Status, db } from "../db";
import type { AppMessage } from "../messages";

const tiny_quantized_q80 = {
    base_url: "https://huggingface.co/lmz/candle-whisper/resolve/main/",
    model: "model-tiny-en-q80.gguf",
    tokenizer: "tokenizer-tiny-en.json",
    config: "config-tiny-en.json",
};
const modelID = "tiny_quantized_q80";
const model = tiny_quantized_q80.model;
const modelURL = tiny_quantized_q80.base_url + model;
const tokenizerURL = tiny_quantized_q80.base_url + tiny_quantized_q80.tokenizer;
const configURL = tiny_quantized_q80.base_url + tiny_quantized_q80.config;

/*let audioURL =
    "https://huggingface.co/datasets/Narsil/candle-examples/resolve/main/samples_jfk.wav";*/
let audioURL = "http://localhost:8080/test.wav"
let mel_filtersURL =
    " https://huggingface.co/spaces/lmz/candle-whisper/resolve/main/mel_filters.safetensors";

let recording = false;

// Background service workers
// https://developer.chrome.com/docs/extensions/mv3/service_workers/

async function fetchArrayBuffer(url: string) {
    const cacheName = "whisper-candle-cache";
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
        const data = await cachedResponse.arrayBuffer();
        return new Uint8Array(data);
    }
    const res = await fetch(url, { cache: "force-cache" });
    cache.put(url, res.clone());
    return new Uint8Array(await res.arrayBuffer());
}

async function initDecoder() {
    let weightsArrayU8, tokenizerArrayU8, mel_filtersArrayU8, configArrayU8;
    [
        weightsArrayU8,
        tokenizerArrayU8,
        mel_filtersArrayU8,
        configArrayU8,
    ] = await Promise.all([
        fetchArrayBuffer(modelURL),
        fetchArrayBuffer(tokenizerURL),
        fetchArrayBuffer(mel_filtersURL),
        fetchArrayBuffer(configURL),
    ]);

    let quantized = false;
    if (modelID.includes("quantized")) {
        quantized = true;
    }
    let is_multilingual = false;
    if (modelID.includes("multilingual")) {
        is_multilingual = true;
    }
    let timestamps = true;
    let decoder = new Decoder(
        weightsArrayU8,
        tokenizerArrayU8,
        mel_filtersArrayU8,
        configArrayU8,
        quantized,
        is_multilingual,
        timestamps,
        undefined,
        undefined,
    );
    return decoder;
}

let decoder: Decoder | undefined = undefined;
// @ts-ignore
chrome.runtime.onInstalled.addListener(() => {

    (async () => {
        await init()
        decoder = await initDecoder();
    })();

    return true;
});

// @ts-ignore
chrome.runtime.onStartup.addListener(setupOffscreen);
self.onmessage = e => {}
setupOffscreen();

// NOTE: If you want to toggle the side panel from the extension's action button,
// you can use the following code:
// TODO : wait fix from chrome to access activeTab from sidePanel (issue : https://groups.google.com/a/chromium.org/g/chromium-extensions/c/DET2SXCFnDg/m/rbG3EfgpAQAJ)
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));

// @ts-ignore
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // console.log(request);
    if (request.cmd === "toggleRecording") {
        let with_mic = request.data;
        // https://stackoverflow.com/questions/48107746/chrome-extension-message-not-sending-response-undefined
        handleRecording(sendResponse, with_mic);
    } else if (request.cmd === "transcribeTestFile") {

        (async () => {
            const res = await fetch(audioURL);
            const audioArrayU8 = new Uint8Array(await res.arrayBuffer());
            if (decoder) {
                const segments = decoder.decode(audioArrayU8);
            }
        })();

        sendResponse({ responseCode: "nice", target: "offscreen" })

    } else if (request.type === "audioWav") {
        // TODO how to desctructure one object into multiple var

        (async () => {
            let audioId = request.data;
            const audioToTranscribe = await db.audios.get(audioId);
            if (audioToTranscribe && audioToTranscribe.audio) {
                const audioArrayU8 = new Uint8Array(audioToTranscribe.audio);
                if (decoder) {

                } else {
                    // TODO TMP FIX DECODER NULL
                    await init()
                    decoder = await initDecoder();
                }

                if (decoder) {

                    // let startTime = performance.now();
                    const segments = decoder.decode(audioArrayU8);
                    // let endTime = performance.now();

                    // let timeDiff = endTime - startTime; //in ms
                    // strip the ms
                    // timeDiff /= 1000;
                    // let seconds = Math.round(timeDiff);
                    // console.log(seconds + " seconds");

                    const jsonSegments = JSON.parse(segments)
                    await db.audios.update(audioId, { transcription: jsonSegments[0]["dr"]["text"], status: Status.transcribed })
                } else {
                    await db.audios.update(audioId, { transcription: "X", status: Status.transcription_failed })
                }

            }
        })();
        sendResponse({ responseCode: "nice", target: "offscreen" })
    }
    return true;
});

// Clients api version
let creating: Promise<void> | null;
async function setupOffscreen() {
    let exist = false;
    // @ts-ignore
    let clientList = await clients.matchAll();

    for (const client of clientList) {
        if (client.url.split('#')[0].endsWith("offscreen.html")) {
            exist = true;
            break;
        }
    }

    if (!exist) {
        if (creating) {
            await creating;
        } else {
            // @ts-ignore
            creating = chrome.offscreen.createDocument({
                url: "src/offscreen/offscreen.html",
                // @ts-ignore
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'reason for needing the document'
            });
            await creating;
            creating = null;
        }
    }
}

async function sendMessageToOffscreenDocument(data: AppMessage) {
    // await setupOffscreen();
    // @ts-ignore
    await chrome.runtime.sendMessage(data);
}

// TODO : replace if possible with only activeTab permission
// But the issue is that I found it works only with chrome.action which I am not able to trigger from the popup
async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    // @ts-ignore
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

const handleRecording = async (sendResponse: (response?: any) => void, mic: boolean) => {
    if (recording) {
        sendMessageToOffscreenDocument({ type: 'stop-recording', target: 'offscreen' })
        sendResponse({ responseCode: "stop-recording", target: "popup" })
        recording = false;
        // chrome.action.setIcon({ path: 'icons/not-recording.png' });
    } else {
        if (mic) {
            sendMessageToOffscreenDocument({ type: 'start-mic-recording', target: 'offscreen' })
            sendResponse({ responseCode: "start-mic-recording", target: "popup" });
            recording = true;
        } else {

            const tab = await getCurrentTab()
            if (tab) {
                // console.log(tab);
                // Get a MediaStream for the active tab.
                // @ts-ignore
                chrome.tabCapture.getMediaStreamId({
                    targetTabId: tab.id
                }, (streamId: string) => {
                    sendMessageToOffscreenDocument({ type: 'start-tab-audio-recording', target: 'offscreen', data: { "streamId": streamId, "tabTitle": tab.title } })
                    sendResponse({ responseCode: "start-tab-audio-recording", target: "popup" })
                    recording = true;
                });
            }
            else {
                sendResponse({ responseCode: "no-activate-tab-found", target: "popup" })
            }
        }
    }
};