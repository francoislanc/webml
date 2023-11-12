function render() {
    // Function to keep the service worker active (with offscreen API workarounds)
    // https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
    setInterval(async () => {
        if (navigator && navigator.serviceWorker) {
            let ready = (await navigator.serviceWorker.ready)
            if (ready.active) {
                ready.active.postMessage('keepAlive');
            }
        }
    }
        , 20e3);

}

document.addEventListener("DOMContentLoaded", render);
