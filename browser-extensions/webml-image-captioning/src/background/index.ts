import init, { Model } from "../webml/blip";
import { ImageSource, Status, db } from "../db";
import type { AppMessage } from "../messages";

const blip_image_quantized_q4k = {
    base_url: "https://huggingface.co/lmz/candle-blip/resolve/main/",
    model: "blip-image-captioning-large-q4k.gguf",
    tokenizer: "tokenizer.json",
    config: "config.json",
    quantized: true,
    size: "271 MB"
};
const modelID = "blip_image_quantized_q4k";
const model = blip_image_quantized_q4k.model;
const modelURL = blip_image_quantized_q4k.base_url + model;
const tokenizerURL = blip_image_quantized_q4k.base_url + blip_image_quantized_q4k.tokenizer;
const configURL = blip_image_quantized_q4k.base_url + blip_image_quantized_q4k.config;
const quantized = blip_image_quantized_q4k.quantized

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
    let weightsArrayU8, tokenizerArrayU8, configArrayU8;
    [
        weightsArrayU8,
        tokenizerArrayU8,
        configArrayU8,
    ] = await Promise.all([
        fetchArrayBuffer(modelURL),
        fetchArrayBuffer(tokenizerURL),
        fetchArrayBuffer(configURL),
    ]);

    let decoder = new Model(
        weightsArrayU8,
        tokenizerArrayU8,
        configArrayU8,
        quantized
    );
    return decoder;
}

let decoder: Model | undefined = undefined;
// @ts-ignore
chrome.runtime.onInstalled.addListener(() => {

    (async () => {
        await init()
        decoder = await initDecoder();
    })();

    return true;
});

// @ts-ignore
/* chrome.runtime.onStartup.addListener(setupOffscreen);
self.onmessage = e => {}
setupOffscreen();
*/

// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension


const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// NOTE: If you want to toggle the side panel from the extension's action button,
// you can use the following code:
// TODO : wait fix from chrome to access activeTab from sidePanel (issue : https://groups.google.com/a/chromium.org/g/chromium-extensions/c/DET2SXCFnDg/m/rbG3EfgpAQAJ)
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));

// @ts-ignore
async function createImage(title: string, data: ArrayBuffer) {
    try {
        // Add the new transcription!
        const id = await db.images.add({
            caption: "",
            tabTitle: title,
            status: Status.decoding,
            image: data,
            source: ImageSource.browser_tab,
            created: new Date(),
        });
        return id;
    } catch (error) {
        console.log(`Failed to add : ${error}`);
    }
}

function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[arr.length - 1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}
export const blobToData = (
    blob: Blob
): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsArrayBuffer(blob);
    });
};


let captureImageTab: string;
let captureTabTitle: string;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request);
    if (request.cmd === "initCapture") {
        (async () => {
            console.log("get current tab")
            const tab = await getCurrentTab()
            console.log(tab)
            captureTabTitle = tab.title
            
            chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (image) => {
                // image is base64
                console.log("got image capture")
                captureImageTab = image;
            })

            // ask to the tab to capture screen part
            const response = await chrome.tabs.sendMessage(tab.id, { cmd: "cropScreen" });

       
        })();
        sendResponse({ responseCode: "nice", target: "offscreen" })

    } else if (request.type === "endCapture") {

        // crop with image
        console.log("sending you the image in the response from crop")
        sendResponse({ responseCode: "cropImage", args: [captureImageTab, request.area, request.dpr, true, "png"] })
    } else if (request.type === "imageToDecode" || request.type === "dataUrlToDecode") {
        // TODO how to desctructure one object into multiple var



        (async () => {

            let imageId;
            if (request.type === "dataUrlToDecode") {
                let file = dataURLtoFile(request.data, "TAB FILE");
                let data = await blobToData(file);
                imageId = await createImage(captureTabTitle, data);
            } else {
                imageId = request.data;
            }
            const imageToCaption = await db.images.get(imageId);
            if (imageToCaption && imageToCaption.image) {
                const imageArrayU8 = new Uint8Array(imageToCaption.image);
                if (decoder) {

                } else {
                    // TODO TMP FIX DECODER NULL
                    await init()
                    decoder = await initDecoder();
                }

                if (decoder) {

                    let startTime = performance.now();
                    console.log("before generation captoin from image")
                    const caption = decoder.generate_caption_from_image(imageArrayU8);
                    let endTime = performance.now();
                    console.log("after generation captoin from image")
                    console.log(caption)

                    let timeDiff = endTime - startTime; //in ms
                    // strip the ms
                    timeDiff /= 1000;
                    let seconds = Math.round(timeDiff);
                    console.log(seconds + " seconds");

                    await db.images.update(imageId, { caption: caption, status: Status.decoded })
                } else {
                    await db.images.update(imageId, { caption: "X", status: Status.failed })
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
        console.log(client.url)
        if (client.url.split('#')[0].endsWith("offscreen.html")) {
            exist = true;
            break;
        }
    }

    if (!exist) {
        if (creating) {
            await creating;
        } else {
            console.log("create offscreen")
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