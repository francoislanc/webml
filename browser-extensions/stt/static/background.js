let recording = false;
let tab = null;


// TODO : replace if possible with only activeTab permission
// But the issue is that I found it works only with chrome.action which I am not able to trigger from the popup
async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

const handleRecording = async (sendResponse) => {
  const existingContexts = await chrome.runtime.getContexts({});
  const tab = await getCurrentTab()
  if (tab) {
    console.log("existingContexts " + existingContexts)
    const offscreenDocument = existingContexts.find(
      (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
    );

    // If an offscreen document is not already open, create one.
    if (!offscreenDocument) {
      console.log("create offscreen document")
      // Create an offscreen document.
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Recording from chrome.tabCapture API'
      });
    } else {
      recording = offscreenDocument.documentUrl.endsWith('#recording');
    }

    if (recording) {
      sendResponse({ responseCode: "stop-recording" })
      chrome.runtime.sendMessage({
        type: 'stop-recording',
        target: 'offscreen'
      });
      // chrome.action.setIcon({ path: 'icons/not-recording.png' });
    } else {
      console.log("current tab")
      console.log(tab);
      // Get a MediaStream for the active tab.
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tab.id
      });

      // Send the stream ID to the offscreen document to start recording.
      sendResponse({ responseCode: "start-recording" })
      chrome.runtime.sendMessage({
        type: 'start-recording',
        target: 'offscreen',
        data: streamId
      });
    }
  } else {
    console.log("no active tab")
    sendResponse({ responseCode: "no-activate-tab-found" })
  }
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("background receive message")
  console.log(request)
  if (request.cmd === "toggleRecording") {
    // https://stackoverflow.com/questions/48107746/chrome-extension-message-not-sending-response-undefined
    handleRecording(sendResponse);
  } else if (request.type === "audioWav") {
    console.log(request.data.b64)
  }
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {


  // chrome.action.setIcon({ path: '/icons/recording.png' });
});