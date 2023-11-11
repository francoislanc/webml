<script lang="ts">
    import { onMount } from "svelte";

    onMount(() => {
        console.log("mounting overlay from content");

        chrome.runtime.onMessage.addListener((req, sender, res) => {
            if (req.cmd === "cropScreen") {
                console.log("start crop screen");
                color = "rgba(255,255,255,0.5)";
                width = 100;
            }
            console.log(req);
        });
    });

    let clientX: number | null = null;
    let clientY: number | null = null;

    async function crop(image, area, dpr, preserve, format) {
        return new Promise((resolve, reject) => {
            console.log(area);
            var top = area.y * dpr;
            var left = area.x * dpr;
            var width = area.w * dpr;
            var height = area.h * dpr;
            var w = dpr !== 1 && preserve ? width : area.w;
            var h = dpr !== 1 && preserve ? height : area.h;

            var canvas = null;
            var template = null;
            if (!canvas) {
                template = document.createElement("template");
                canvas = document.createElement("canvas");
                document.body.appendChild(template);
                template.appendChild(canvas);
            }
            canvas.width = w;
            canvas.height = h;

            console.log("crop function");
            console.log(canvas);

            var img = new Image();
            img.onload = () => {
                console.log("onload", h, w);
                var context = canvas.getContext("2d");
                context.drawImage(img, left, top, width, height, 0, 0, w, h);
                console.log("before dataurl");
                var cropped = canvas.toDataURL(`image/${format}`);
                console.log("after dataurl");
                resolve(cropped);
            };
            img.src = image;
        });
    }

    let color = "rgba(0,0,0,0.5)";
    let width = 0;

    function handleMousemove(e) {
        // console.log(e);
        clientX = e.clientX;
        clientY = e.clientY;

        // clientX, clientY = e;
    }

    let clientXBegin: number | null = null;
    let clientYBegin: number | null = null;
    let clientXEnd: number | null = null;
    let clientYEnd: number | null = null;
    let clicked = false;
    async function onSVGClick() {
        console.log("click svg");
        if (!clicked) {
            clicked = !clicked;
            clientXBegin = clientX;
            clientYBegin = clientY;
            color = "rgba(0,0,0,0.5)";
        } else {
            clicked = !clicked;
            clientXEnd = clientX;
            clientYEnd = clientY;

            // clip image
            if (clientXBegin && clientYBegin && clientXEnd && clientYEnd) {
                console.log("send capture area");
                let msg = {
                    type: "endCapture",
                    area: {
                        x: clientXBegin,
                        y: clientYBegin,
                        w: clientXEnd - clientXBegin,
                        h: clientYEnd - clientYBegin,
                    },
                    dpr: devicePixelRatio,
                };
                console.log(msg);
                const response = await chrome.runtime.sendMessage(msg);
                console.log(response);

                if (response.args) {
                    console.log("will execute crop");
                    let croppedDataUrl = await crop(
                        response.args[0],
                        response.args[1],
                        response.args[2],
                        response.args[3],
                        response.args[4]
                    );
                    console.log("got crop image");

                    // @ts-ignore
                    const response2 = await chrome.runtime.sendMessage({
                        target: "background",
                        type: "dataUrlToDecode",
                        data: croppedDataUrl,
                    });
                    console.log(response2);
                    color = "rgba(0,0,0,0.5)";
                    width = 0;
                    clientXBegin = null;
                    clientYBegin = null;
                    clientXEnd = null;
                    clientYEnd = null;
                }
            }
        }
    }
</script>

<!-- reset the path array following a click event -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<svg
    style="background-color: {color}; width: {width}%"
    on:mousemove={handleMousemove}
    on:click={async () => await onSVGClick()}
>
    {#if clientX != null && clientY != null && clientXBegin != null && clientYBegin != null}
        <rect
            x={clientXBegin}
            y={clientYBegin}
            width={clientX - clientXBegin}
            height={clientY - clientYBegin}
            stroke="transparent"
            stroke-width="1"
            fill="white"
            fill-opacity="0.5"
        />
    {/if}
</svg>

<style>
    svg {
        position: fixed;
        z-index: 1;
        top: 0;
        left: 0;
        height: 100%;
    }
</style>
