// content_crawler.js
// Bridges Purple Sorcerer Crawler Companion page events into the MV3 service worker via a long-lived Port.
// Includes MV3 keepalive ping + reconnect hygiene.



// ---- declarations FIRST (before any function calls) ----
// Port + timers are module-level so we can manage reconnects cleanly
let p20_port = null;
let pingIntervalId = null;
let reconnectTimerId = null;




// Holds the port state (in-memory only)
const p20_state = {
  p20_port: null,
  set purple20_port(port) {
    this.p20_port = port;
    console.log("purple20 registration - port = ", this.p20_port);
  },
  get purple20_port() {
    return this.p20_port;
  },
};


// Kick off immediately (or swap to a delayed connect if you prefer)
connect();

// Listen for messages posted to window from the MAIN world script (content_crawler_main.js)
// We only accept messages from ourselves (same window)
window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (event.data?.source !== "purple20") return;


  const cmd = event.data?.cmd;
  const payload = event.data?.payload;

  console.log("window message received", cmd, payload);

  // Defensive: payload should be a string for .includes usage and for forwarding
  if (typeof payload !== "string") {
    console.log("Ignoring message with non-string payload", event.data);
    return;
  }

  // Special-case: detect DCC character generator output
  let event_data_cmd = cmd;
  if (payload.includes("Generator Settings: Source: Rulebook")) {
    event_data_cmd = "dcc_char";
    console.log("converting to dcc_char");
  }

  // Ensure we have a port; attempt reconnect if missing
  if (!p20_state.purple20_port) {
    console.log("Port missing; reconnecting");
    connect();
  }

  // Guard: connect() is not synchronous; avoid null.postMessage
  const port = p20_state.purple20_port;
  if (!port) return;

  try {
    port.postMessage({ cmd: event_data_cmd, payload });
  } catch (e) {
    console.log("postMessage failed (will reconnect)", e);
    // Force a reconnect path
    teardownPort();
    scheduleReconnect();
  }
});

function connect() {
  register();
}

function register() {
  console.log("Creating crawler message pump and registering with p20");

  // If we already have a live port, don't create another
  if (p20_port && p20_state.purple20_port === p20_port) return;

  // Clear any pending reconnect attempt
  if (reconnectTimerId) {
    clearTimeout(reconnectTimerId);
    reconnectTimerId = null;
  }

  // Establish a new port
  p20_port = chrome.runtime.connect({ name: "purple20_crawler" });
  p20_state.purple20_port = p20_port;

  // Register with the service worker
  try {
    p20_port.postMessage({ cmd: "register", payload: "register" });
  } catch (e) {
    console.log("Failed to send register; scheduling reconnect", e);
    teardownPort();
    scheduleReconnect();
    return;
  }

  // MV3 keepalive: prevent service worker from idling while this tab is open
  if (pingIntervalId) clearInterval(pingIntervalId);
  pingIntervalId = setInterval(() => {
    try {
      p20_port?.postMessage({ cmd: "ping", payload: Date.now() });
    } catch (e) {
      // Port may be gone; disconnect handler will handle reconnect
    }
  }, 20000);

  // Optional: log messages from the service worker (acks, etc.)
  p20_port.onMessage.addListener(function (msg) {
    console.log("purple20_crawler received :", msg);
  });

  // Handle disconnects cleanly with backoff
  p20_port.onDisconnect.addListener(() => {
    console.log("p20 disconnected");
    teardownPort();
    scheduleReconnect();
  });
}

function teardownPort() {
  p20_state.purple20_port = null;

  // Stop keepalive pings
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  // Let the old port be GC'd; don't try to use it again
  p20_port = null;
}

function scheduleReconnect() {
  if (reconnectTimerId) return; // already scheduled
  reconnectTimerId = setTimeout(() => {
    reconnectTimerId = null;
    register();
  }, 1000);
}
