import { bufferToWAVE } from "./wavUtils";
import { db } from "../db";

// Options
// https://developer.chrome.com/docs/extensions/mv3/options/

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

async function addAudio(content: ArrayBuffer) {
    try {
        // Add the new transcription!
        const id = await db.audios.add({
            transcription: "Not transcribed yet",
            audio: content,
            status: "not_transcribed"
        });
        return id;
    } catch (error) {
        console.log(`Failed to add : ${error}`);
    }
}

function download(blob) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audio.wav";
    anchor.click();
}

function render() {
    chrome.runtime.onMessage.addListener(async (message) => {
        console.log(message);
        if (message.target === "offscreen") {
            switch (message.type) {
                case "start-recording":
                    startRecording(message.data);
                    break;
                case "stop-recording":
                    stopRecording();
                    break;
                default:
                    throw new Error("Unrecognized message:", message.type);
            }
        }
    });

    let recorder;
    let data = [];

    async function startRecording(streamId) {

        if (recorder?.state === "recording") {
            throw new Error(
                "Called startRecording while recording is in progress."
            );
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: streamId
                },
            },
            /*video: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: streamId,
                },
            },*/
        });

        // const audioContext = new AudioContext({
        //     sampleRate: 16000
        // });
        // const mediaStreamSource = audioContext.createMediaStreamSource(mediaStream)
        // const mediaStreamDestination = audioContext.createMediaStreamDestination()
        // mediaStreamDestination.channelCount = 1
        // // Continue to play the captured audio to the user.
        // mediaStreamSource.connect(audioContext.destination)

        // // Continue to play the captured audio to the user.
        const audioCtx  = new AudioContext();
        const source = audioCtx .createMediaStreamSource(mediaStream);
        
        source.connect(audioCtx .destination);

        // Start recording.
        recorder = new MediaRecorder(mediaStream, {
            mimeType: 'audio/webm;codecs=pcm',
        });
        recorder.ondataavailable = async (event) => {
            data.push(event.data);
        };
        recorder.onstop = async () => {
            const blob = new Blob(data, { type: "audio/webm;codecs=pcm" });
                        
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new AudioContext({sampleRate: 16000});
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            let wavBlob = bufferToWAVE(audioBuffer)
            // const wavBlob = await getWaveBlob(blob, false, {sampleRate: 16000});
            const wavArrayBuffer = await wavBlob.arrayBuffer()
            let id = await addAudio(wavArrayBuffer)
            console.log("in offscreen")
            console.log(wavBlob)
            const base64 = await blobToBase64(wavBlob);
            // let url = URL.createObjectURL(wavBlob)
            // window.open(url, "_blank");

            chrome.runtime.sendMessage({
                target: 'background',
                type: 'audioWav',
                data: id,
            });
            // Clear state ready for next recording
            recorder = undefined;
            data = [];
        };
        recorder.start();

        // Record the current state in the URL. This provides a very low-bandwidth
        // way of communicating with the service worker (the service worker can check
        // the URL of the document and see the current recording state). We can't
        // store that directly in the service worker as it may be terminated while
        // recording is in progress. We could write it to storage but that slightly
        // increases the risk of things getting out of sync.
        window.location.hash = "recording";
    }

    async function stopRecording() {
        recorder.stop();

        // Stopping the tracks makes sure the recording icon in the tab is removed.
        recorder.stream.getTracks().forEach((t) => t.stop());

        // Update current state in URL
        window.location.hash = "";

        // Note: In a real extension, you would want to write the recording to a more
        // permanent location (e.g IndexedDB) and then close the offscreen document,
        // to avoid keeping a document around unnecessarily. Here we avoid that to
        // make sure the browser keeps the Object URL we create (see above) and to
        // keep the sample fairly simple to follow.
    }
}

document.addEventListener("DOMContentLoaded", render);
