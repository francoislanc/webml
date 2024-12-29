import { RawImage } from "@huggingface/transformers";
import Dexie, { type Table } from "dexie";
import { exportDB } from "dexie-export-import";
import download from "downloadjs";

export enum Status {
  decoding = "decoding",
  decoded = "decoded",
  failed = "failed",
}

export enum ImageSource {
  browser_tab = "browser_tab",
  file = "file",
}

export interface AppImage {
  id?: number;
  rawImage?: RawImage;
  image?: ArrayBuffer;
  tabTitle: string;
  caption: string;
  status: Status;
  source: ImageSource;
  created: Date;
}

export enum Setting {
  theme = "theme",
}

export interface AppSetting {
  name: string;
  value: string;
}

export class AppDexie extends Dexie {
  images!: Table<AppImage>;
  settings!: Table<AppSetting>;

  constructor() {
    super("webml-image-captioning-db");
    this.version(1).stores({
      images:
        "++id, rawImage, image, tabTitle, caption, status, source, created", // Primary key and indexed props
      settings: "++name, value",
    });
  }
}

export async function exportAppDb() {
  try {
    const blob = await exportDB(db, {
      prettyJson: true,
      transform: (table, value, key) => {
        delete value["rawImage"];
        return { value: value, key: key };
      },
    });
    download(blob, "webml-image-captioning-export.json", "application/json");
  } catch (error) {
    console.error("" + error);
  }
}

export async function createImage(
  title: string,
  rawImage: RawImage,
  image: ArrayBuffer,
) {
  try {
    // Add the new caption!
    const id = await db.images.add({
      caption: "",
      tabTitle: title,
      status: Status.decoding,
      rawImage: rawImage,
      image: image,
      source: ImageSource.file,
      created: new Date(),
    });
    return id;
  } catch (error) {
    console.log(`Failed to add : ${error}`);
  }
}
export const db = new AppDexie();
