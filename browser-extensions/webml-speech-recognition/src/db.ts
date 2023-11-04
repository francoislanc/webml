import Dexie, { type Table } from 'dexie';


export enum Status {
  mic_recording = "mic_recording",
  tab_recording = "tab_recording",
  transcribing = "transcribing",
  transcribed = "transcribed",
  transcription_failed = "transcription_failed"
};

export interface AppAudio {
  id?: number;
  audio?: ArrayBuffer;
  tabTitle: string;
  transcription: string;
  status: Status;
}


export class AppDexie extends Dexie {
  audios!: Table<AppAudio>; 

  constructor() {
    super('webml-speech-recognition-db');
    this.version(1).stores({
      audios: '++id, audio, tabTitle, transcription, status', // Primary key and indexed props
    });
  }
}

export const db = new AppDexie();