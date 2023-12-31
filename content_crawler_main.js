window.setTimeout(overrides, 5000); //ensures page is fully loaded before executing functions

// override the hook location.  
function overrides (){

	console.log("Overriding sendMessage")
	sendMessage = function(e, t) {
		window.postMessage({cmd: "cc_log", payload: t}, "*");
		socket.emit(e, t)
	}
}
