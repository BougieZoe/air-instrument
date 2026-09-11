import { writeFileSync } from "node:fs";

const endpoint = "http://127.0.0.1:9223/json";
const pages = await fetch(endpoint).then((response) => response.json());
const page = pages.find((item) => item.url.includes("127.0.0.1:5173")) ?? pages[0];

if (!page?.webSocketDebuggerUrl) {
  throw new Error("No Chrome DevTools page found.");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, (message) => {
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
};

await evaluate("document.body.innerText.includes('AIR INSTRUMENT') && document.body.innerText.includes('Play the air.')");
await evaluate("document.querySelector('.start-panel button').click()");
await new Promise((resolve) => setTimeout(resolve, 4500));

const state = await evaluate(`(() => {
  const samplerPads = document.querySelectorAll('.air-pad').length;
  const modeButtons = Array.from(document.querySelectorAll('.mode-switcher button')).map((button) => button.textContent.trim());
  const status = document.querySelector('.tracking-indicator')?.textContent.trim();
  const instruction = document.querySelector('.gesture-instruction')?.textContent.trim();
  const firstPad = document.querySelector('.air-pad');
  firstPad?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 10 }));
  const samplerState = firstPad?.dataset.state;
  document.querySelectorAll('.mode-switcher button')[1]?.click();
  const firstKey = document.querySelector('.piano-hit');
  firstKey?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 11 }));
  firstKey?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 11 }));
  return {
    title: document.querySelector('.brand')?.textContent.trim(),
    samplerPads,
    modeButtons,
    status,
    instruction,
    samplerState,
    pianoKeys: document.querySelectorAll('.piano-key').length,
    importVisible: Boolean(document.querySelector('.import-button'))
  };
})()`);

const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync("output/playwright/air-instrument.png", Buffer.from(screenshot.data, "base64"));

console.log(JSON.stringify(state, null, 2));
ws.close();
