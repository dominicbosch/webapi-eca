/* requires module needle */


// <kbd>pollWebpage</kbd> polls a <kbd>url</kbd> and emits an event on the <kbd>webhookname</kbd>
// with the status if the status code changed. The emitted event has two properties:
// <ul>
//   <li><kbd>code</kbd>: the status code</li>
//   <li><kbd>message</kbd>: the status message</li>
// </ul>
var needle = modules.needle;
var statusCode = -1;
exports.statusChange = function(url, webhookname) {
	needle.get(url, function(err, resp) {
		var status = {
			url: url,
			code: resp.statusCode,
			message: resp.statusMessage
		};
		if(err) {
			status.code = -1;
			status.message = err.message;
		}
		if(statusCode !== status.code) {
			log('Change detected on "'+url+'"! now: '+status.code);
			datalog(status);
			emitEvent(webhookname, status);
			statusCode = status.code;	
		}
	});
};
