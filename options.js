const p20_state = {
  r20_port: null,
  cc_port: null,
  set roll20_port(port) {
    this.r20_port = port;
	console.log("roll20 registration - port = ", this.r20_port)
  },
  get roll20_port() {
	return this.r20_port;
  },
  set crawler_port(port) {
    this.cc_port = port;
	console.log("crawler registration - port = ", this.cc_port)
  },
  get crawler_port() {
	return this.cc_port;
  },
};


chrome.runtime.sendMessage("getRoll20Status", function(response) {
  console.log(`message from getRoll20Status: ${JSON.stringify(response)}`);
  //document.getElementById('roll20Status').value=response.result;
  document.getElementById('roll20Status').innerHTML=response.result;
});

chrome.runtime.sendMessage("getCrawlerStatus", function(response) {
  console.log(`message from getCrawlerStatus: ${JSON.stringify(response)}`);
  //document.getElementById('crawlerStatus').value=response.result;
  document.getElementById('crawlerStatus').innerHTML=response.result;
});