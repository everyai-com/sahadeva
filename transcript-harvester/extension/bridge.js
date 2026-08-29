const REQUEST = "TRANSCRIPT_HARVEST_REQUEST";
const EVENT_PREFIX = "TRANSCRIPT_HARVEST_";
const allowedOrigin = ["localhost", "127.0.0.1"].includes(location.hostname)
  || location.hostname.startsWith("transcript-harvester.")
  || location.hostname === "transcript-harvester.pages.dev";

if (allowedOrigin) window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "TRANSCRIPT_HARVEST_PING") {
    window.postMessage({ type: "TRANSCRIPT_HARVEST_CONNECTED" }, window.location.origin);
    return;
  }
  if (event.data?.type !== REQUEST) return;
  chrome.runtime.sendMessage(event.data).catch((error) => {
    window.postMessage({ type: "TRANSCRIPT_HARVEST_ERROR", requestId: event.data.requestId, error: error.message }, window.location.origin);
  });
});

if (allowedOrigin) chrome.runtime.onMessage.addListener((message) => {
  if (typeof message?.type === "string" && message.type.startsWith(EVENT_PREFIX)) {
    window.postMessage(message, window.location.origin);
  }
});

if (allowedOrigin) window.postMessage({ type: "TRANSCRIPT_HARVEST_CONNECTED" }, window.location.origin);
