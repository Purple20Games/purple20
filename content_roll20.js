window.setTimeout(connect, 5000); //ensures page is fully loaded before executing functions

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

(function(){
	if (p20_state.purple20_port)
		p20_state.purple20_port.postMessage({cmd: "ping", payload: "ping"});
    setTimeout(arguments.callee, 10000);
})();


const postToRoll20Chat = (msg) => {
  const chatInputElement = document.querySelector('#textchat-input textarea'),
    chatButtonElement = document.querySelector('#textchat-input .btn');
	
  // remove and restore any text in the chat box while we hijack it to post this message to chat
  if (chatInputElement && chatButtonElement) {
    const activeText = chatInputElement.value;
    chatInputElement.value = templated_msg;
    chatButtonElement.click();
    if (activeText) setTimeout(() => chatInputElement.value = activeText, 10);
  }
}

const postSimpleToRoll20Chat = (msg) => {
  templated_msg = "&{template:default} {{name=Purple20 doth speak}} {{msg=" + msg + "}}"
  postToRoll20Chat(templated_msg);
}

const postLogToRoll20Chat = (log) => {
  var t = JSON.parse(log);
  
  if (t.mode == "rolls")
	templated_msg = "&{template:default} {{name=Purple20 doth roll!}} {{roll=" + t.rollValue + "}}"
  else
	templated_msg = "&{template:default} {{name=Purple20 doth speak!}} {{msg=" + t.rollValue + "}}"
  
  postToRoll20Chat(templated_msg);
}

function register () {


}

function connect (){
	console.log("Creating roll20 message pump");
	
	// register and listen for events from background on purple20_roll20
	(async () => {
		p20_port = chrome.runtime.connect({name: "purple20_roll20"});
		p20_port.postMessage({cmd: "register", payload: "register" });
		
		p20_port.onMessage.addListener(function(msg) {
		  console.log("purple20_roll20 event received", msg);
		  
		   // since we got something back, go ahead and assume the port is valid
		  p20_state.purple20_port = p20_port;
		  
		  if (msg.cmd == "single_msg")
			postSimpleToRoll20Chat(msg.payload)
			
		  else if (msg.cmd == "cc_log") {
			postLogToRoll20Chat(msg.payload)
		  }
		  else
			console.log("Unknown cmd", msg.cmd);
		  
		});
	})();

}




