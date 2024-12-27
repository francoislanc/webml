// @ts-nocheck

const noOp = () => {};
const forEachAudioParam = (node, f, g = noOp) => {
  for (p in node) {
    if (node[p] instanceof AudioParam) {
      f(node[p], p);
    } else {
      g(node[p], p);
    }
  }
};

const recreateOnlineNode = (offlineAudioCtx, audioNode) => {
  if (audioNode instanceof DynamicsCompressorNode) {
    const offlineCompressor = offlineAudioCtx.createDynamicsCompressor();
    forEachAudioParam(audioNode, (param, k) => {
      offlineCompressor[k].value = param.value;
    });
    return offlineCompressor;
  } else {
    throw new Error("Don't know how to clone this type of audioNode.");
  }
};

const recreateOnlineGraph = (offlineSource, offlineAudioCtx, onlineGraph) => {
  let lastConnectedOffline = offlineSource;
  onlineGraph.audioNodes.forEach((audioNode) => {
    const recreatedNode = recreateOnlineNode(offlineAudioCtx, audioNode);
    lastConnectedOffline.connect(recreatedNode);
    lastConnectedOffline = recreatedNode;
  });
  lastConnectedOffline.connect(offlineAudioCtx.destination);
};

const offlineAudioContextFromBuffer = (audioBuffer) => {
  const { sampleRate, numberOfChannels, duration } = audioBuffer;
  const offlineAudioCtx = new OfflineAudioContext({
    numberOfChannels: numberOfChannels,
    length: sampleRate * duration,
    sampleRate,
  });
  return offlineAudioCtx;
};

export const offlineBuffer = async (audioBuffer, onlineGraph) => {
  const offlineAudioCtx = offlineAudioContextFromBuffer(audioBuffer);
  const offlineSource = offlineAudioCtx.createBufferSource();
  offlineSource.buffer = audioBuffer;

  recreateOnlineGraph(offlineSource, offlineAudioCtx, onlineGraph);

  offlineSource.start(0);

  const renderedBuffer = await offlineAudioCtx.startRendering();

  return renderedBuffer;
};

class IndexedBufferView {
  constructor(length) {
    this.buffer = new ArrayBuffer(length);
    this.view = new DataView(this.buffer);
    this.pos = 0;
  }
  setUint16(data) {
    this.view.setUint16(this.pos, data, true);
    this.pos += 2;
  }
  setUint32(data) {
    this.view.setUint32(this.pos, data, true);
    this.pos += 4;
  }
}

export const bufferToWAVE = (audioBuffer) => {
  const { sampleRate, duration, numberOfChannels } = audioBuffer;
  // force numberOfChannels = 1
  let myNumberOfChannels = 1;
  const samplesPerChannel = sampleRate * duration;
  const bytesPerSample = 2;
  const headerLengthInBytes = 44;
  const fileLength =
    samplesPerChannel * myNumberOfChannels * bytesPerSample +
    headerLengthInBytes;
  const byteRate = sampleRate * bytesPerSample * myNumberOfChannels;
  const channels = [];
  const content = new IndexedBufferView(fileLength);

  content.setUint32(0x46464952); // "RIFF" chunk
  content.setUint32(fileLength - 8); // file length - 8 (size of this and previous fields)
  content.setUint32(0x45564157); // "WAVE"

  content.setUint32(0x20746d66); // "fmt " chunk
  content.setUint32(16); // length = 16
  content.setUint16(1); // PCM (uncompressed)
  content.setUint16(myNumberOfChannels); // usually 2 (for stereo left and right)
  content.setUint32(sampleRate); // usually 44,100 or 48,000
  content.setUint32(byteRate); // avg. bytes/sec
  content.setUint16(myNumberOfChannels * 2); // block-align aka. frame size
  content.setUint16(16); // 16-bit (hardcoded in this demo)

  content.setUint32(0x61746164); // "data" - chunk
  content.setUint32(fileLength - content.pos - 4); // length of *just* the data we're about to put in

  // gather all channels at once into an array of channel data
  // so we don't call getChannelData() millions of times below
  for (let i = 0; i < myNumberOfChannels; i++)
    channels.push(audioBuffer.getChannelData(i));

  // actually write the data field of the "data" chunk
  let sampleIndex = 0;
  while (content.pos < fileLength) {
    for (let i = 0; i < myNumberOfChannels; i++) {
      const float32Sample = channels[i][sampleIndex];
      const scaledSample = float32Sample * 32767;
      const roundedSample = Math.round(scaledSample);
      const clampedInt16Sample = Math.max(
        -32768,
        Math.min(roundedSample, 32767),
      );
      content.setUint16(clampedInt16Sample);
    }
    sampleIndex++;
  }

  return new Blob([content.buffer], { type: "audio/wav;codecs=pcm" });
};

export const bufferToWAVDataURL = (audioBuffer) => {
  const fileDataURL = URL.createObjectURL(bufferToWAVE(audioBuffer));

  return fileDataURL;
};
