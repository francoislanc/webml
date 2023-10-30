import { writable } from 'svelte/store';

type IStorage = {
    count: number;
};

const defaultStorage: IStorage = {
    count: 0,
};

export const storage = {
    get: (): Promise<IStorage> =>
        chrome.storage.sync.get(defaultStorage) as Promise<IStorage>,
    set: (value: IStorage): Promise<void> => chrome.storage.sync.set(value),
};


/* Default store value */
let isRecording = "false";

/* Check for an existing value in localStorage */
if (typeof localStorage !== `undefined`) {
    if (localStorage.getItem(`isRecording`) !== null) {
        isRecording = localStorage.getItem(`isRecording`);
    }
}

/* Set store to default value or localStorage value */
const isRecordingStore = writable(isRecording);

/* Export store */
export default isRecordingStore;

/* Listen for changes to the store, and update localStorage with the most recent value */
isRecordingStore.subscribe((newValue) => {
    if (typeof localStorage !== `undefined`) {
        localStorage.setItem(`isRecording`, newValue);
    }
});