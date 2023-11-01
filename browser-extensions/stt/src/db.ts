import Dexie, { type Table } from 'dexie';

export interface Audio {
  id?: number;
  audio?: ArrayBuffer;
  transcription: string;
  status: string;
}

export class AppDexie extends Dexie {
  // 'friends' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  audios!: Table<Audio>; 

  constructor() {
    super('stt-db');
    this.version(1).stores({
      audios: '++id, audio, transcription, status' // Primary key and indexed props
    });
  }
}

export const db = new AppDexie();