import Dexie, { type Table } from 'dexie';


export enum Status {
  decoding = "decoding",
  decoded = "decoded",
  failed = "failed"
};

export enum ImageSource {
  browser_tab = "browser_tab",
  file = "file",
};

export interface AppImage {
  id?: number;
  image?: ArrayBuffer;
  tabTitle: string;
  caption: string;
  status: Status;
  source: ImageSource;
  created: Date;
}


export class AppDexie extends Dexie {
  images!: Table<AppImage>; 

  constructor() {
    super('webml-image-captioning-db');
    this.version(1).stores({
      images: '++id, audio, tabTitle, transcription, status, source, created', // Primary key and indexed props
    });
  }
}

export const db = new AppDexie();