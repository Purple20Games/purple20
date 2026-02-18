// content_roll20.js
// Receives messages from the MV3 service worker and posts them into Roll20 chat.
// Includes MV3 keepalive ping + reconnect hygiene + avoids interval leaks / implicit globals.


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


connect();

const postToRoll20Chat = (msg) => {
  const chatInputElement = document.querySelector("#textchat-input textarea");
  const chatButtonElement = document.querySelector("#textchat-input .btn");

  // Remove and restore any text in the chat box while we hijack it to post
  if (chatInputElement && chatButtonElement) {
    const activeText = chatInputElement.value;
    chatInputElement.value = msg;
    chatButtonElement.click();
    if (activeText) setTimeout(() => (chatInputElement.value = activeText), 10);
  } else {
    console.log("Roll20 chat elements not found yet");
  }
};

const postSimpleToRoll20Chat = (msg) => {
  const templated_msg = `&{template:default} {{name=Purple20}} {{msg=${msg}}}`;
  postToRoll20Chat(templated_msg);
};

const postLogToRoll20Chat = (log, replace_html) => {
  let t;
  try {
    t = JSON.parse(log);
  } catch (e) {
    console.log("Failed to parse log JSON", e, log);
    postSimpleToRoll20Chat(String(log));
    return;
  }

  // TODO: make this more intelligent
  let msg = t.rollValue ?? "";

  if (replace_html === true && typeof msg === "string") {
    msg = msg.replaceAll("<br>", "\r");
    msg = msg.replaceAll(/<\/?strong>/g, "**");
  }

  const templated_msg =
    t.mode === "rolls"
      ? `&{template:default} {{name=Purple20 Roll}} {{roll=${msg}}}`
      : `&{template:default} {{name=Purple20}} {{msg=${msg}}}`;

  postToRoll20Chat(templated_msg);
};

function connect() {
  console.log("Creating roll20 message pump");
  register();
}

function register() {
  // Clear any pending reconnect attempt
  if (reconnectTimerId) {
    clearTimeout(reconnectTimerId);
    reconnectTimerId = null;
  }

  // If we already have a live port, don't create another
  if (p20_port && p20_state.purple20_port === p20_port) return;

  // Establish a new port
  p20_port = chrome.runtime.connect({ name: "purple20_roll20" });
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

  p20_port.onMessage.addListener(function (msg) {
    console.log("purple20_roll20 event received", msg);

    if (!msg || !msg.cmd) return;

    if (msg.cmd === "single_msg") {
      postSimpleToRoll20Chat(msg.payload);
    } else if (msg.cmd === "cc_log") {
      postLogToRoll20Chat(msg.payload, true);
    } else if (msg.cmd === "dcc_char") {
      postLogToRoll20Chat(msg.payload, true);
    } else if (msg.cmd === "ack") {
      // registration ack; no-op
    } else if (msg.cmd === "ping") {
      // keepalive; no-op
    } else {
      console.log("Unknown cmd", msg.cmd);
    }
  });

  p20_port.onDisconnect.addListener(() => {
    console.log("p20 disconnected");
    teardownPort();
    scheduleReconnect();
  });
}

function teardownPort() {
  p20_state.purple20_port = null;

  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  p20_port = null;
}

function scheduleReconnect() {
  if (reconnectTimerId) return; // already scheduled
  reconnectTimerId = setTimeout(() => {
    reconnectTimerId = null;
    register();
  }, 1000);
}
