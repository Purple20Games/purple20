// background.js (MV3 service worker)
// Routes messages between the crawler and Roll20 content scripts.
// Key goals:
// - Never crash the worker on postMessage failures
// - Don’t rely on non-existent "sendingPort" param
// - Handle ping/ack/noise cleanly
// - Avoid console spam from keepalive pings

function safePost(port, msg) {
  if (!port) return false;
  try {
    port.postMessage(msg);
    return true;
  } catch (e) {
    console.log("postMessage failed:", e);
    return false;
  }
}

// Tracks the ports opened to the crawler and Roll20 content scripts.
// Note: Ports are NOT serializable; only store status/metadata in storage.
const p20_state = {
  r20_port: null,
  cc_port: null,

  set roll20_port(port) {
    this.r20_port = port;
    console.log("roll20 registration - port = ", this.r20_port);
    chrome.storage.local.set({ r20_status: port ? "connected" : "disconnected" });
  },
  get roll20_port() {
    return this.r20_port;
  },

  set crawler_port(port) {
    this.cc_port = port;
    console.log("crawler registration - port = ", this.cc_port);
    chrome.storage.local.set({ cc_status: port ? "connected" : "disconnected" });
  },
  get crawler_port() {
    return this.cc_port;
  },

  get_roll20_status() {
    return this.r20_port ? "connected" : "disconnected";
  },
  get_crawler_status() {
    return this.cc_port ? "connected" : "disconnected";
  },
};

// Listen for messages from the popup/options
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request === "getRoll20Status") {
    sendResponse({ result: p20_state.get_roll20_status() });
  } else if (request === "getCrawlerStatus") {
    sendResponse({ result: p20_state.get_crawler_status() });
  } else {
    sendResponse({ result: "unknown cmd" });
  }

  // Returning true keeps the response channel alive if needed.
  return true;
});

// Optional: throttle ping logging (so you can turn it on without spam)
let lastPingLogMs = 0;
function maybeLogPing(label) {
  const now = Date.now();
  if (now - lastPingLogMs > 60000) { // at most once per minute
    console.log(label);
    lastPingLogMs = now;
  }
}

// Listen for content script connections (roll20, crawler)
chrome.runtime.onConnect.addListener(function (port) {
  console.log("received a connect event. port name = ", port.name);

  if (port.name === "purple20_crawler") {
    port.onMessage.addListener(function (msg) {
      // Be defensive: MV3 is happy to deliver unexpected shapes
      const cmd = msg?.cmd;
      const payload = msg?.payload;

      if (!cmd) return;

      if (cmd === "register") {
        p20_state.crawler_port = port;
        safePost(port, { cmd: "ack", payload: "Crawler registration successful" });
        return;
      }

      if (cmd === "cc_log" || cmd === "dcc_char") {
        // Forward to Roll20 if available; safePost prevents worker crashes
        safePost(p20_state.roll20_port, { cmd, payload });
        return;
      }

      if (cmd === "ack") {
        // no-op
        return;
      }

      if (cmd === "ping") {
        // keepalive; no-op (optionally log rarely)
        // maybeLogPing("crawler ping received");
        return;
      }

      console.log("Unknown msg.cmd from crawler:", cmd);
    });

    port.onDisconnect.addListener(() => {
      console.log("Crawler port disconnected");
      // Only clear if this is the currently-registered port
      if (p20_state.crawler_port === port) p20_state.crawler_port = null;
    });

    return; // done
  }

  if (port.name === "purple20_roll20") {
    port.onMessage.addListener(function (msg) {
      const cmd = msg?.cmd;
      const payload = msg?.payload;

      if (!cmd) return;

      if (cmd === "register") {
        p20_state.roll20_port = port;
        safePost(port, { cmd: "ack", payload: "Roll20 registration successful" });
        return;
      }

      if (cmd === "ack") {
        // no-op
        return;
      }

      if (cmd === "ping") {
        // keepalive; no-op (optionally log rarely)
        // maybeLogPing("roll20 ping received");
        return;
      }

      console.log("Unknown msg.cmd from roll20:", cmd);
    });

    port.onDisconnect.addListener(() => {
      console.log("Roll20 port disconnected");
      // Only clear if this is the currently-registered port
      if (p20_state.roll20_port === port) p20_state.roll20_port = null;
    });

    return; // done
  }

  // Unknown port name
  console.log("Unknown port name:", port.name);
});
