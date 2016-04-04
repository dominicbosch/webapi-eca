/* requires module needle */


// <kbd>pollWebpage</kbd> polls a <kbd>url</kbd> and emits an event on the <kbd>webhookname</kbd>
// with the status if the status code changed. The emitted event has two properties:
// <ul>
//   <li><kbd>code</kbd>: the status code</li>
//   <li><kbd>message</kbd>: the status message</li>
// </ul>
var needle = modules.needle;

if(!persistence.statusCode) {
	persistence.statusCode = -1;
	persist();
}
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
		if(persistence.statusCode !== status.code) {
			log('Change detected on "'+url+'"! now: '+status.code);
			datalog(status);
			emitEvent(webhookname, status);
			persistence.statusCode = status.code;
			persist();
		}
	});
};

if(!persistence.pageSnippet) {
	persistence.pageSnippet = '';
	persist();
}
exports.webpageChange = function(url, selector, webhookname) {
	needle.get(url, function(err, resp) {
		if(err) log('Error fetching "'+url+'": '+err.message);
		else {
			var content = cheerio.load(resp.body)(selector);
			if(persistence.pageSnippet !== content) {
				log('Change detected on "'+url+'"! now: '+content);
				emitEvent(webhookname, { old: persistence.pageSnippet, new: content });
				persistence.pageSnippet = content;
				persist();
			}
		}
	});
};
