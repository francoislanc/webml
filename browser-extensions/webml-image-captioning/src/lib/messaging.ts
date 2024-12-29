import { RawImage } from "@huggingface/transformers";
import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  initCapture(): string;
  endCapture(): string;
  rawImageToDecode(data: { resizedImage: RawImage; image: string }): boolean;
  imageToDecode(id: string): boolean;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
