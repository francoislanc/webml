import { bufferToWAVE } from "./wavUtils";
import { AudioSource, Status, db } from "../db";

// Options
// https://developer.chrome.com/docs/extensions/mv3/options/

function blobToBase64(blob: Blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

async function createEmptyAudio(tabTitle: string, withMic: boolean) {
    try {
        // Add the new transcription!
        const id = await db.audios.add({
            transcription: "",
            tabTitle: tabTitle,
            status: withMic ? Status.mic_recording : Status.tab_recording,
            source: withMic ? AudioSource.microphone : AudioSource.browser_tab,
            created: new Date()
        });
        return id;
    } catch (error) {
        console.log(`Failed to add : ${error}`);
    }
}

async function updateAudio(id: string, content: ArrayBuffer) {
    try {
        await db.audios.update(id, { audio: content, status: Status.transcribing })
        return id;
    } catch (error) {
        console.log(`Failed to add : ${error}`);
    }
}

function render() {
    
    chrome.runtime.onMessage.addListener(async (message) => {
        if (message.target === "offscreen") {
            switch (message.type) {
                case "start-tab-audio-recording":
                    const { streamId, tabTitle } = message.data
                    startRecording(streamId, tabTitle);
                    break;
                case "start-mic-recording":
                    startMicRecording();
                    break;
                case "stop-recording":
                    stopRecording();
                    break;
                default:
                    throw new Error("Unrecognized message:", message.type);
            }
        }
    });


    setInterval(async () => {
        if (navigator && navigator.serviceWorker) {
            let ready = (await navigator.serviceWorker.ready)
            if (ready.active) {
                ready.active.postMessage('keepAlive');
            }
        }
    }
        , 20e3);

    let recorder: MediaRecorder | null = null;
    let data: BlobPart[] = [];
    let recordingId: string | null = null;

    async function startMicRecording() {

        if (recorder?.state === "recording") {
            throw new Error(
                "Called startRecording while recording is in progress."
            );
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

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
                const audioContext = new AudioContext({ sampleRate: 16000 });
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
                let wavBlob = bufferToWAVE(audioBuffer)
                const wavArrayBuffer = await wavBlob.arrayBuffer()
                if (recordingId) {
                    await updateAudio(recordingId, wavArrayBuffer)
                }
                // let url = URL.createObjectURL(wavBlob)
                // window.open(url, "_blank");

                
                chrome.runtime.sendMessage({
                    target: 'background',
                    type: 'audioWav',
                    data: recordingId,
                });
                // Clear state ready for next recording
                recorder = null;
                data = [];
            };
            recorder.start();
            recordingId = await createEmptyAudio("", true);

            // Record the current state in the URL. This provides a very low-bandwidth
            // way of communicating with the service worker (the service worker can check
            // the URL of the document and see the current recording state). We can't
            // store that directly in the service worker as it may be terminated while
            // recording is in progress. We could write it to storage but that slightly
            // increases the risk of things getting out of sync.
            window.location.hash = "recording";
        } catch (err) {
            console.log(err)
            console.error(err);
        }
    }

    async function startRecording(streamId: string, tabTitle: string) {

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

        // // Continue to play the captured audio to the user.
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(mediaStream);

        source.connect(audioCtx.destination);

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
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            let wavBlob = bufferToWAVE(audioBuffer)
            const wavArrayBuffer = await wavBlob.arrayBuffer()
            if (recordingId) {
                await updateAudio(recordingId, wavArrayBuffer)
            }
            // let url = URL.createObjectURL(wavBlob)
            // window.open(url, "_blank");

            
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'audioWav',
                data: recordingId,
            });
            // Clear state ready for next recording
            recorder = null;
            data = [];
        };
        recorder.start();
        recordingId = await createEmptyAudio(tabTitle, false);

        // Record the current state in the URL. This provides a very low-bandwidth
        // way of communicating with the service worker (the service worker can check
        // the URL of the document and see the current recording state). We can't
        // store that directly in the service worker as it may be terminated while
        // recording is in progress. We could write it to storage but that slightly
        // increases the risk of things getting out of sync.
        window.location.hash = "recording";
    }

    async function stopRecording() {

        if (recorder) {
            recorder.stop();

            // Stopping the tracks makes sure the recording icon in the tab is removed.
            recorder.stream.getTracks().forEach((t) => t.stop());
        }

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
