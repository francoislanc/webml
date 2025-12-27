import { PipelineSingleton, runModel } from "../lib/caption";
import { onMessage } from "../lib/messaging";
import { createImage, db, Status, updateModel } from "../lib/db";
import { full, ProgressInfo, RawImage } from "@huggingface/transformers";
export const ERROR_EXCEPTION = "Decoding failed";

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
      pixel_values: full([1, 3, 224, 224], 0.0),
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

async function runCaptionOnDbImage(id: string) {
  const imageToCaption = await db.images.get(id);
  if (imageToCaption && imageToCaption.rawImage) {
    try {
      let rawImage = new RawImage(
        imageToCaption.rawImage.data,
        imageToCaption.rawImage.width,
        imageToCaption.rawImage.height,
        imageToCaption.rawImage.channels
      );
      let result = await runModel(rawImage);
      await db.images.update(id, {
        caption: result,
        status: Status.decoded,
      });
    } catch (error) {
      console.log(error);
      let errorMsg = ERROR_EXCEPTION;
      if (error instanceof Error) {
        errorMsg = `${ERROR_EXCEPTION} (${error.message})`;
      }
      await db.images.update(id, {
        caption: errorMsg,
        status: Status.failed,
      });
    }
  } else {
    await db.images.update(id, {
      caption: "Not able to find audio id",
      status: Status.failed,
    });
  }
}

onMessage("imageToDecode", async (message) => {
  let id = message.data;
  await runCaptionOnDbImage(id);
  return true;
});

let captureImageTab: string;
let captureTabTitle: string | undefined;
onMessage("initCapture", async (message) => {
  const tab = await getCurrentTab();

  if (tab.id != undefined) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["/content-scripts/content.js"],
    });
  }
  return true;
});

function captureVisibleTab(windowId: number): Promise<string> {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (image) => {
      resolve(image);
    });
  });
}

onMessage("endCapture", async (message) => {
  // give time for the UI to be updated
  await new Promise((r) => setTimeout(r, 100));

  const tab = await getCurrentTab();
  captureTabTitle = tab.title;
  captureImageTab = "";
  captureImageTab = await captureVisibleTab(tab.windowId);
  return captureImageTab;
});

onMessage("rawImageToDecode", async (message) => {
  let base64result = message.data.image.split(",")[1];
  let arrayBuffer = base64ToArrayBuffer(base64result);

  let id = await createImage(
    captureTabTitle ?? "untitled tab",
    message.data.resizedImage,
    arrayBuffer
  );
  await runCaptionOnDbImage(id);
  return true;
});
