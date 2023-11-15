<script lang="ts">
    let clientX: number | null = null;
    let clientY: number | null = null;

    interface Area {
        x: number;
        y: number;
        h: number;
        w: number;
    }

    async function crop(
        image: string,
        area: Area,
        dpr: number,
        preserve: boolean,
        format: string
    ) {
        return new Promise((resolve, reject) => {
            var top = area.y * dpr;
            var left = area.x * dpr;
            var width = area.w * dpr;
            var height = area.h * dpr;
            var w = dpr !== 1 && preserve ? width : area.w;
            var h = dpr !== 1 && preserve ? height : area.h;

            var canvas: HTMLCanvasElement | null = null;
            var template = null;
            if (!canvas) {
                template = document.createElement("template");
                canvas = document.createElement("canvas");
                document.body.appendChild(template);
                template.appendChild(canvas);
            }
            canvas.width = w;
            canvas.height = h;

            var img = new Image();
            img.onload = () => {
                if (canvas) {
                    var context = canvas.getContext("2d");
                    if (context) {
                        context.drawImage(
                            img,
                            left,
                            top,
                            width,
                            height,
                            0,
                            0,
                            w,
                            h
                        );
                        var cropped = canvas.toDataURL(`image/${format}`);
                        resolve(cropped);
                    }
                }
            };
            img.src = image;
        });
    }

    function removeWidthCropScreen() {
        let el = document.getElementById("webml-image-captioning-svg");
        if (el) {
            el.style.width = "0vw";
        }
    }

    function changeBackgroundCropScreen() {
        let el = document.getElementById("webml-image-captioning-svg");
        if (el) {
            el.style.backgroundColor = "rgba(0,0,0,0.5)";
        }
    }

    function handleMousemove(e: MouseEvent) {
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
        if (!clicked) {
            clicked = !clicked;
            clientXBegin = clientX;
            clientYBegin = clientY;
            changeBackgroundCropScreen();
        } else {
            clicked = !clicked;
            clientXEnd = clientX;
            clientYEnd = clientY;

            // clip image
            if (clientXBegin && clientYBegin && clientXEnd && clientYEnd) {

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

                removeWidthCropScreen();
                clientXBegin = null;
                clientYBegin = null;
                clientXEnd = null;
                clientYEnd = null;
                
                const response = await chrome.runtime.sendMessage(msg);

                if (response.args) {
                    // TODO improve syntax
                    let croppedDataUrl = await crop(
                        response.args[0],
                        response.args[1],
                        response.args[2],
                        response.args[3],
                        response.args[4]
                    );

                    const response2 = await chrome.runtime.sendMessage({
                        target: "background",
                        type: "dataUrlToDecode",
                        data: croppedDataUrl,
                    });
                }
            }
        }
    }
</script>

<!-- reset the path array following a click event -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<svg
    id="webml-image-captioning-svg"
    style="background-color: rgba(255,255,255,0.5); width: 100vw;     position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
    height: 100vh;"
    on:mousemove={handleMousemove}
    on:click={async () => await onSVGClick()}
>
    {#if clientX != null && clientY != null && clientXBegin != null && clientYBegin != null && clientX > clientXBegin && clientY > clientYBegin}
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
    {:else}
        <switch>
            <foreignObject
                x="40%"
                y="40%"
                width="250"
                height="200"
                style="pointer-events: none; text-align:center;"
            >
                <p
                    style=" font: bold 30px sans-serif;
                color: black;"
                >
                    Click to start the screenshot area selection
                </p>
            </foreignObject>

            <text x="20" y="20">Your SVG viewer cannot display html.</text>
        </switch>
    {/if}
</svg>
