import { writable } from 'svelte/store';

/* Default store value */
let isRecording = "false";

/* Check for an existing value in localStorage */
if (typeof localStorage !== `undefined`) {
    if (localStorage.getItem(`isRecording`) !== null) {
        isRecording = localStorage.getItem(`isRecording`);
    }
}

/* Set store to default value or localStorage value */
const store = writable(isRecording);

/* Export store */
export default store;

/* Listen for changes to the store, and update localStorage with the most recent value */
store.subscribe((newValue) => {
    if (typeof localStorage !== `undefined`) {
        localStorage.setItem(`isRecording`, newValue);
    }
});