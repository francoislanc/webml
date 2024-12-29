<script lang="ts">
  import { RawImage } from "@huggingface/transformers";
  import { sendMessage } from "./messaging";
  import { blobToB64 } from "../utils/dataConversion";

  let clientX: number | null = null;
  let clientY: number | null = null;
  let pageX: number | null = null;
  let pageY: number | null = null;

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
  ): Promise<string> {
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
            context.drawImage(img, left, top, width, height, 0, 0, w, h);
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
      el.style.backgroundColor = "rgba(0,0,0,0)";
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

    pageX = e.pageX;
    pageY = e.pageY;
    // clientX, clientY = e;
  }

  async function getB64FromRawImage(image: RawImage) {
    // Clone, and convert data to RGBA before drawing to canvas.
    // This is because the canvas API only supports RGBA
    const cloned = image.clone().rgba();
    // Create canvas object for the cloned image
    const clonedCanvas = new window.OffscreenCanvas(
      cloned.width,
      cloned.height
    );
    // Draw image to context
    const data = new ImageData(cloned.data, cloned.width, cloned.height);
    clonedCanvas.getContext("2d").putImageData(data, 0, 0);

    let blob = await clonedCanvas.convertToBlob({
      type: "image/png",
      quality: 1,
    });
    // let blob = await image.toBlob()
    let b64image = await blobToB64(blob);
    return b64image;
  }

  let clientXBegin: number | null = null;
  let clientYBegin: number | null = null;
  let clientXEnd: number | null = null;
  let clientYEnd: number | null = null;
  let pageXBegin: number | null = null;
  let pageYBegin: number | null = null;
  let pageXEnd: number | null = null;
  let pageYEnd: number | null = null;
  let clicked = false;

  const strokeWidth = 3;
  async function onSVGClick() {
    if (!clicked) {
      clicked = !clicked;
      clientXBegin = clientX;
      pageXBegin = pageX;
      clientYBegin = clientY;
      pageYBegin = pageY;

      changeBackgroundCropScreen();
    } else {
      clicked = !clicked;
      clientXEnd = clientX;
      clientYEnd = clientY;
      pageXEnd = pageX;
      pageYEnd = pageY;

      // clip image
      if (clientXBegin && clientYBegin && clientXEnd && clientYEnd) {
        let area = {
          x: clientXBegin + strokeWidth*2,
          y: clientYBegin + strokeWidth*2,
          w: clientXEnd - clientXBegin - strokeWidth*2,
          h: clientYEnd - clientYBegin - strokeWidth*2,
        };

        removeWidthCropScreen();
        clientXBegin = null;
        pageXBegin = null;
        clientYBegin = null;
        pageYBegin = null;
        clientXEnd = null;
        pageXEnd = null;
        clientYEnd = null;
        pageYEnd = null;

        const tabImageB64 = await sendMessage("endCapture", undefined);

        let croppedDataUrl = await crop(
          tabImageB64,
          area,
          devicePixelRatio,
          true,
          "png"
        );

        let file = dataURLtoFile(croppedDataUrl, "tabfile.png");
        let image = await RawImage.fromBlob(file);
        let resizedImage = await image.resize(224, 224, { resample: 2 });
        let b64image = await getB64FromRawImage(image);
        resizedImage.data = Array.from(resizedImage.data);

        await sendMessage("rawImageToDecode", {
          resizedImage: resizedImage,
          image: b64image,
        });
      }
    }
  }
</script>

<!-- reset the path array following a click event -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<svg
  id="webml-image-captioning-svg"
  style="background-color: rgba(255,255,0,0.5); width: 100vw;     position: absolute;
    z-index: 10;
    top: 0;
    left: 0;
    height: 9000px;"
  on:mousemove={handleMousemove}
  on:click={async () => await onSVGClick()}
>
  {#if pageX != null && pageY != null && pageXBegin != null && pageYBegin != null}
    {#if pageX > pageXBegin && pageY > pageYBegin}
      <rect
        x={pageXBegin}
        y={pageYBegin}
        width={pageX - pageXBegin}
        height={pageY - pageYBegin}
        stroke="rgba(255,255,0,1)"
        stroke-width={strokeWidth}
        fill="rgb(255,255,0)"
        fill-opacity="0.5"
      />
    {/if}
  {:else if pageX != null && pageY != null}
    <switch>
      <foreignObject
        x={pageX + 50}
        y={pageY + 50}
        width="250"
        height="200"
        style="pointer-events: none; text-align:center;"
      >
        <p style=" font: bold 30px sans-serif; color: black;">
          Click to start the screenshot area selection
        </p>
      </foreignObject>

      <text x="20" y="20">Your SVG viewer cannot display html.</text>
    </switch>
  {/if}
</svg>
