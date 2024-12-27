import { bufferToWAVE } from "../../utils/wavUtils";
import { onMessage, sendMessage } from "../../lib/messaging";
import { createEmptyAudio, updateAudio } from "../../lib/db";

onMessage("startRecordMic", async (message) => {
  let r = message.data;
  let recordingId = await createEmptyAudio("", true);

  await startMicRecording(recordingId);
  return true;
});

onMessage("startRecordTab", async (message) => {
  let { streamId, tabTitle } = message.data;
  let recordingId = await createEmptyAudio(tabTitle, false);

  await startRecording(recordingId, streamId);
  return true;
});

onMessage("stopRecordOffscreen", async (message) => {
  await stopRecording();
  return true;
});

let recorder: MediaRecorder | null = null;
let data: BlobPart[] = [];

async function startMicRecording(recordingId: string) {
  if (recorder?.state === "recording") {
    throw new Error("Called startRecording while recording is in progress.");
  }

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    // Start recording.
    recorder = new MediaRecorder(mediaStream, {
      mimeType: "audio/webm;codecs=pcm",
    });
    recorder.ondataavailable = async (event) => {
      data.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(data, { type: "audio/webm;codecs=pcm" });

      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      let wavBlob = bufferToWAVE(audioBuffer);
      const wavArrayBuffer = await wavBlob.arrayBuffer();
      if (recordingId) {
        await updateAudio(recordingId, wavArrayBuffer);
      }
      // let url = URL.createObjectURL(wavBlob)
      // window.open(url, "_blank");

      await sendMessage("runAudioTranscription", recordingId);

      // Clear state ready for next recording
      recorder = null;
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
  } catch (err) {
    console.error(err);
  }
}

async function startRecording(recordingId: string, streamId: string) {
  if (recorder?.state === "recording") {
    throw new Error("Called startRecording while recording is in progress.");
  }

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
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
    mimeType: "audio/webm;codecs=pcm",
  });
  recorder.ondataavailable = async (event) => {
    data.push(event.data);
  };
  recorder.onstop = async () => {
    const blob = new Blob(data, { type: "audio/webm;codecs=pcm" });

    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    let wavBlob = bufferToWAVE(audioBuffer);
    const wavArrayBuffer = await wavBlob.arrayBuffer();
    if (recordingId) {
      await updateAudio(recordingId, wavArrayBuffer);
    }
    // let url = URL.createObjectURL(wavBlob)
    // window.open(url, "_blank");

    await sendMessage("runAudioTranscription", recordingId);
    // Clear state ready for next recording
    recorder = null;
    data = [];
  };
  recorder.start();
}

async function stopRecording() {
  if (recorder) {
    recorder.stop();

    // Stopping the tracks makes sure the recording icon in the tab is removed.
    recorder.stream.getTracks().forEach((t) => t.stop());
  }
}
