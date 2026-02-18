window.setTimeout(overrides, 5000); // ensure page is fully loaded

function overrides() {
  try {
    // Prevent double-hooking
    if (window.__purple20_sendMessage_hooked) return;
    window.__purple20_sendMessage_hooked = true;

    const originalSendMessage = window.sendMessage;
    const originalSocketEmit = window.socket && typeof window.socket.emit === "function"
      ? window.socket.emit.bind(window.socket)
      : null;

    if (typeof originalSendMessage !== "function") {
      console.log("Purple20: sendMessage not found; not hooking");
      return;
    }

    console.log("Purple20: overriding sendMessage");

    window.sendMessage = function (e, t) {
      // Mark messages so the content script can filter reliably
      window.postMessage({ source: "purple20", cmd: "cc_log", payload: t }, "*");

      // Prefer calling the original if possible (less site breakage)
      try {
        return originalSendMessage.apply(this, arguments);
      } catch (err) {
        // Fallback: if original fails but socket.emit exists, try it
        if (originalSocketEmit) {
          return originalSocketEmit(e, t);
        }
        throw err;
      }
    };
  } catch (e) {
    console.log("Purple20: override failed", e);
  }
}
