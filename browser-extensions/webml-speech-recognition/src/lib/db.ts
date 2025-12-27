import Dexie, { type Table } from "dexie";
import { exportDB } from "dexie-export-import";
import download from "downloadjs";

export enum Status {
  mic_recording = "mic_recording",
  tab_recording = "tab_recording",
  transcribing = "transcribing",
  transcribed = "transcribed",
  transcription_failed = "transcription_failed",
}

export enum AudioSource {
  microphone = "microphone",
  browser_tab = "browser_tab",
  file = "file",
}

export enum Setting {
  theme = "theme",
}

export interface AppAudio {
  id?: number;
  audio?: ArrayBuffer;
  tabTitle: string;
  transcription: string;
  status: Status;
  source: AudioSource;
  created: Date;
}

export interface AppSetting {
  name: string;
  value: string;
}

export interface AppModel {
  name: string;
  isLoading: boolean;
  isLoaded: boolean;
  error: boolean;
  currentStep: string;
  created: Date;
}

export class AppDexie extends Dexie {
  audios!: Table<AppAudio>;
  settings!: Table<AppSetting>;
  models!: Table<AppModel>;

  constructor() {
    super("webml-speech-recognition-db");
    this.version(2).stores({
      audios: "++id, audio, tabTitle, transcription, status, source, created", // Primary key and indexed props
      settings: "++name, value",
      models: "++name, isLoading, isLoaded, error, currentStep, created",
    });
  }
}

export async function exportAudioDb() {
  try {
    const blob = await exportDB(db, {
      prettyJson: true,
    });
    download(blob, "webml-speech-recognition-export.json", "application/json");
  } catch (error) {
    console.error("" + error);
  }
}

export async function createFileAudio(title: string, data: ArrayBuffer) {
  try {
    // Add the new transcription!
    const id = await db.audios.add({
      transcription: "",
      tabTitle: title,
      status: Status.transcribing,
      audio: data,
      source: AudioSource.file,
      created: new Date(),
    });
    return id;
  } catch (error) {
    console.log(`Failed to add : ${error}`);
  }
}

export async function createEmptyAudio(
  tabTitle: string,
  withMic: boolean
): Promise<string> {
  // Add the new transcription!
  const id: string = await db.audios.add({
    transcription: "",
    tabTitle: tabTitle,
    status: withMic ? Status.mic_recording : Status.tab_recording,
    source: withMic ? AudioSource.microphone : AudioSource.browser_tab,
    created: new Date(),
  });
  return id;
}

export async function updateModel(
  name: string,
  isLoading: boolean,
  isLoaded: boolean,
  error: boolean,
  currentStep: string
) {
  try {
    let model = await db.models.get(name);
    if (model == undefined) {
      const key: string = await db.models.add({
        name: name,
        isLoading: isLoading,
        isLoaded: isLoaded,
        error: error,
        currentStep: currentStep,
        created: new Date(),
      });
    } else {
      await db.models.update(name, {
        name: name,
        isLoading: isLoading,
        isLoaded: isLoaded,
        error: error,
        currentStep: currentStep,
      });
    }
  } catch (error) {
    console.log(`Failed to update : ${error}`);
  }
}

export async function updateAudio(id: string, content: ArrayBuffer) {
  try {
    await db.audios.update(id, { audio: content, status: Status.transcribing });
    return id;
  } catch (error) {
    console.log(`Failed to add : ${error}`);
  }
}

export const db = new AppDexie();
