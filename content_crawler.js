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

// replace this with stateful storage
(function(){
	if (p20_state.purple20_port)
		p20_state.purple20_port.postMessage({cmd: "ping", payload: "ping"});
    setTimeout(arguments.callee, 10000);
})();




window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;
		
	console.log("windows message receieved", event.data.cmd, event.data.payload);
	
	// for now, simply try to register if you aren't connected  TBD
	if (p20_state.purple20_port)
		p20_state.purple20_port.postMessage({cmd: event.data.cmd, payload: event.data.payload});
	else
		console.log("Trying to communicate, but purple20_port = ", p20_state.purple20_port);
});



function register () {

	// register and listen for events from background on purple20_crawler
	console.log("Creating crawler message pump and registering with p20");
	
	(async () => {
		p20_port = chrome.runtime.connect({name: "purple20_crawler"});
		p20_port.postMessage({cmd: "register", payload: "register"});
		
		p20_port.onMessage.addListener(function(msg) {
		  console.log("purple20_crawler received :: ", msg);
		  
		  // since we got something back, go ahead and assume the port is valid
		  p20_state.purple20_port = p20_port;
		});
	})();

}


function connect (){

	register();

}







