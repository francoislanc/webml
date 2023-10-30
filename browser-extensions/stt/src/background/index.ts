import init, { Decoder } from "../webml/m";
import { storage } from "../storage";


const tiny_quantized_multilingual_q80 = {
    base_url: "https://huggingface.co/lmz/candle-whisper/resolve/main/",
    model: "model-tiny-q80.gguf",
    tokenizer: "tokenizer-tiny.json",
    config: "config-tiny.json",
};
const modelID = "tiny_quantized_multilingual_q80";
const model = tiny_quantized_multilingual_q80.model;
const modelURL = tiny_quantized_multilingual_q80.base_url + model;
const tokenizerURL =
    tiny_quantized_multilingual_q80.base_url +
    tiny_quantized_multilingual_q80.tokenizer;
const configURL =
    tiny_quantized_multilingual_q80.base_url +
    tiny_quantized_multilingual_q80.config;

let audioURL =
    "https://huggingface.co/datasets/Narsil/candle-examples/resolve/main/samples_jfk.wav";
let mel_filtersURL =
    " https://huggingface.co/spaces/lmz/candle-whisper/resolve/main/mel_filters.safetensors";

let recording = false;

// Background service workers
// https://developer.chrome.com/docs/extensions/mv3/service_workers/

async function fetchArrayBuffer(url) {
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


let weightsArrayU8, tokenizerArrayU8, mel_filtersArrayU8, configArrayU8;
let decoder;
chrome.runtime.onInstalled.addListener(() => {
    storage.get().then(console.log);
    init().then(console.log);

    (async () => {
        console.log("downloading models");
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
        console.log(weightsArrayU8)
        console.log("downloading done")

        let quantized = false;
        if (modelID.includes("quantized")) {
            quantized = true;
        }
        let is_multilingual = false;
        if (modelID.includes("multilingual")) {
            is_multilingual = true;
        }
        let timestamps = true;
        decoder = new Decoder(
            weightsArrayU8,
            tokenizerArrayU8,
            mel_filtersArrayU8,
            configArrayU8,
            quantized,
            is_multilingual,
            timestamps,
            null,
            null,
        );

        const audioArrayU8 = await fetchArrayBuffer(audioURL);
        console.log("decoding")
        const segments = decoder.decode(audioArrayU8);
        console.log(segments)
    })();

    return true;
});

// NOTE: If you want to toggle the side panel from the extension's action button,
// you can use the following code:
// TODO : wait fix from chrome to access activeTab from sidePanel (issue : https://groups.google.com/a/chromium.org/g/chromium-extensions/c/DET2SXCFnDg/m/rbG3EfgpAQAJ)
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.cmd === "toggleRecording") {
        // https://stackoverflow.com/questions/48107746/chrome-extension-message-not-sending-response-undefined
        handleRecording(sendResponse);
    } else if (request.type === "audioWav") {
        console.log(request.data.b64)
        // run transcription

    }
    return true;
});

// Clients api version
let creating;
async function setupOffscreen() {
    let exist = false;
    let clientList = await clients.matchAll();

    for (const client of clientList) {
        console.log(client.url.split('#')[0])
        if (client.url.split('#')[0].endsWith("offscreen.html")) {
            exist = true;
            break;
        }
    }

    if (!exist) {
        if (creating) {
            await creating;
        } else {
            creating = chrome.offscreen.createDocument({
                url: "src/offscreen/offscreen.html",
                reasons: ['CLIPBOARD'],
                justification: 'reason for needing the document'
            });
            await creating;
            creating = null;
        }
    }
}

async function sendMessageToOffscreenDocument(data) {
    await setupOffscreen();
    chrome.runtime.sendMessage(data);
}

// TODO : replace if possible with only activeTab permission
// But the issue is that I found it works only with chrome.action which I am not able to trigger from the popup
async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

const handleRecording = async (sendResponse) => {
    const tab = await getCurrentTab()
    if (tab) {
        if (recording) {
            sendMessageToOffscreenDocument({ type: 'stop-recording', target: 'offscreen' })
            sendResponse({ responseCode: "stop-recording" })
            recording = false;
            // chrome.action.setIcon({ path: 'icons/not-recording.png' });
        } else {
            console.log("current tab")
            console.log(tab);
            // Get a MediaStream for the active tab.
            const streamId = await chrome.tabCapture.getMediaStreamId({
                targetTabId: tab.id
            });

            sendMessageToOffscreenDocument({ type: 'start-recording', target: 'offscreen', data: streamId })
            sendResponse({ responseCode: "start-recording" })
            recording = true;
        }
    } else {
        console.log("no active tab")
        sendResponse({ responseCode: "no-activate-tab-found" })
    }
};