
// this is our state object.  It tracks the ports opened 
// to the crawler and roll20 content sheets
const p20_state = {
  r20_port: null,
  cc_port: null,
  set roll20_port(port) {
    this.r20_port = port;
	console.log("roll20 registration - port = ", this.r20_port);
	chrome.storage.local.set({"r20_port": port});
  },
  get roll20_port() {
	return this.r20_port;
  },
  set crawler_port(port) {
    this.cc_port = port;
	console.log("crawler registration - port = ", this.cc_port);
	chrome.storage.local.set({"cc_port": port});
  },
  get crawler_port() {
	return this.cc_port;
  },
  get_roll20_status() {
	if (this.r20_port != null)
		return "connected";
	else 
		return "disconnected";
  },
  get_crawler_status() {
	if (this.cc_port != null)
		return "connected";
	else
		return "disconnected";
  }
};


	
/*
(async () => {
	const response = await fetch("https://muna.ironarachne.com/human/?count=3&nameType=male");
	const jsonData = await response.json();
	// JSON.parse does not evaluate the attacker's scripts.
	//let resp = JSON.parse(jsonData);
	console.log(jsonData);
}) ();
*/	



// listen for messages from the popup / options
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request == "getRoll20Status") {
      sendResponse({ result: p20_state.get_roll20_status() });
    } else if (request == "getCrawlerStatus") {
      sendResponse({ result: p20_state.get_crawler_status() });
    } else {
      sendResponse({ result: "unknown cmd" });
    }
    // Note: Returning true is required here!
    // ref: http://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
    return true; 
  }
);

  


// listen for a content script (roll20, cc) connection. 
// add a listener for registration, cc_logs, pings, acks and other messages
chrome.runtime.onConnect.addListener(function(port) {

	console.log("received a connect event. port name = ", port.name);
	

	// crawler may emit various messages.  Listen for them.
	if (port.name == "purple20_crawler") {
		port.onMessage.addListener(function(msg, sendingPort) {
			console.log("purple20_crawler listener received an event", msg);
			
			if (msg.cmd == "register") {
				p20_state.crawler_port = sendingPort;
				port.postMessage({cmd: "ack", payload: "Crawler registration successful"});
			}
			else if (msg.cmd == "cc_log")
				p20_state.roll20_port.postMessage({cmd: msg.cmd, payload: msg.payload});
			else if (msg.cmd == "dcc_char")
				p20_state.roll20_port.postMessage({cmd: msg.cmd, payload: msg.payload});
			else if (msg.cmd == "ack")
				console.log("ack received")
			else if (msg.cmd == "ping") {
				//console.log("ping received")
			}
			else
				console.log("Unknown msg.cmd", msg.cmd);
			
		});
		port.onDisconnect.addListener(() => {
			console.log("Crawler port disconnected");
			p20_state.crawler_port = null;
		});
	}
	
	// roll20 may emit various commands (limited to registration and ping r/n)
	if (port.name == "purple20_roll20") {
		port.onMessage.addListener(function(msg, sendingPort) {
			console.log("purple20_roll20 listener received an event", msg);
	  
			if (msg.cmd == "register") {
				p20_state.roll20_port = sendingPort
				port.postMessage({cmd: "ack", payload: "Roll20 registration successful"});
			}
			else if (msg.cmd == "ack")
				console.log("ack received")
		});
		
		port.onDisconnect.addListener(() => {
			console.log("Roll20 port disconnected");
			p20_state.roll20_port = null;
		});
	}
});

