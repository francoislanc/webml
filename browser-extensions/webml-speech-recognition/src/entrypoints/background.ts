import { transcribe, PipelineSingleton } from "../lib/transcribe";
import { full, ProgressInfo } from "@huggingface/transformers";
import { onMessage, sendMessage } from "../lib/messaging";
import { db, Status, updateModel } from "../lib/db";
export const ERROR_TRANSCRIPTION_EXCEPTION = "Audio decoding failed";
export const ERROR_TRANSCRIPTION_TIMEOUT = "Transcription failed (timeout)";

export const TRANSCRIPTION_TIMEOUT_MS = 60000;

export const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export default defineBackground(async () => {
  await updateModel(
    PipelineSingleton.model,
    false,
    false,
    false,
    "Initialization"
  );

  await updateModel(PipelineSingleton.model, true, false, false, "Downloading");
  let pipeline = await PipelineSingleton.getInstance(
    async (data: ProgressInfo) => {}
  );
  // simulate slow downloading
  // await sleep(10000);

  // Run model with dummy input to compile shaders
  if (pipeline) {
    await updateModel(PipelineSingleton.model, true, false, false, "Running");
    await pipeline.model.generate({
      input_features: full([1, 80, 3000], 0.0),
      max_new_tokens: 1,
    });
    // simulate slow execution
    // await sleep(10000);
    await updateModel(PipelineSingleton.model, false, true, false, "");
  }
});

// TODO : replace if possible with only activeTab permission
// But the issue is that I found it works only with browse.action which I am not able to trigger from the popup
async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.

  let [tab] = await browser.tabs.query(queryOptions);
  return tab;
}

async function createOffscreenDocument() {
  try {
    await browser.offscreen.createDocument({
      url: browser.runtime.getURL("/offscreen.html"),
      reasons: [browser.offscreen.Reason.USER_MEDIA],
      justification: "reason for needing the document",
    });
  } catch (error) {
    if (!error.message.startsWith("Only a single offscreen")) throw error;
  }
}

onMessage("runAudioTranscription", async (message) => {
  let audioId = message.data;
  const audioToTranscribe = await db.audios.get(audioId);
  if (audioToTranscribe && audioToTranscribe.audio) {
    try {
      let result = await transcribe(audioToTranscribe.audio);
      await db.audios.update(audioId, {
        transcription: result["text"],
        status: Status.transcribed,
      });
    } catch (error) {
      let errorMsg = ERROR_TRANSCRIPTION_EXCEPTION;
      if (error instanceof Error) {
        errorMsg = `${ERROR_TRANSCRIPTION_EXCEPTION} (${error.message})`;
      }
      await db.audios.update(audioId, {
        transcription: errorMsg,
        status: Status.transcription_failed,
      });
    }
  } else {
    await db.audios.update(audioId, {
      transcription: "Not able to find audio id",
      status: Status.transcription_failed,
    });
  }
  return "Transcription is done";
});

let record = false;
onMessage("startRecord", async (message) => {
  let withMic: boolean = message.data;

  await createOffscreenDocument();
  if (withMic) {
    const result = await sendMessage("startRecordMic", undefined);
  } else {
    const tab = await getCurrentTab();
    if (tab) {
      browser.tabCapture.getMediaStreamId(
        {
          targetTabId: tab.id,
        },
        (streamId: string) => {
          const result = sendMessage("startRecordTab", {
            streamId: streamId,
            tabTitle: tab.title ?? "",
          });
        }
      );
    }
  }

  return true;
});

onMessage("stopRecord", async (message) => {
  await sendMessage("stopRecordOffscreen", undefined);
  return true;
});
