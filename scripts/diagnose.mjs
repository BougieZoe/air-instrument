import { writeFileSync } from "node:fs";

const WS_URL = "ws://127.0.0.1:9224/devtools/page/47D3192901266B66B10D97864BF0DA74";

const ws = new WebSocket(WS_URL);
let id = 0;
const pending = new Map();

ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

await new Promise((r) => ws.addEventListener("open", r, { once: true }));

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const cid = ++id;
    pending.set(cid, { resolve, reject });
    ws.send(JSON.stringify({ id: cid, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");

// Click START button
await send("Runtime.evaluate", {
  expression: `document.querySelector('.start-panel button')?.click()`,
  awaitPromise: false,
});

// Wait for camera + MediaPipe to init
console.log("Waiting 6s for camera + MediaPipe...");
await new Promise((r) => setTimeout(r, 6000));

// Diagnose everything
const result = await send("Runtime.evaluate", {
  expression: `(() => {
    const video = document.querySelector('video');
    const debugEl = document.querySelector('.debug-overlay');
    const debugText = debugEl ? debugEl.innerText : 'NO DEBUG OVERLAY';
    const brand = document.querySelector('.brand')?.textContent;
    const tracking = document.querySelector('.tracking-indicator')?.textContent;
    const instruction = document.querySelector('.gesture-instruction')?.textContent;
    return {
      brand,
      tracking,
      instruction,
      debugText,
      video: video ? {
        srcObject: !!video.srcObject,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        paused: video.paused,
        display: getComputedStyle(video).display,
        visibility: getComputedStyle(video).visibility,
        opacity: getComputedStyle(video).opacity,
        zIndex: getComputedStyle(video).zIndex,
      } : 'NO VIDEO ELEMENT'
    };
  })()`,
  returnByValue: true,
  awaitPromise: false,
});

console.log("\n=== DIAGNOSIS ===");
console.log(JSON.stringify(result.result.value, null, 2));

// Take screenshot
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("/Users/bougiezoe/zoe-os-react/output/playwright/diagnose.png", Buffer.from(shot.data, "base64"));
console.log("\nScreenshot saved to output/playwright/diagnose.png");

ws.close();
