import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  runAudioTranscription(audioId: string): string;
  startRecord(withMic: boolean): boolean;
  stopRecord(): boolean;
  startRecordMic(): boolean;
  startRecordTab(data: { streamId: string; tabTitle: string }): boolean;
  stopRecordOffscreen(): boolean;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
