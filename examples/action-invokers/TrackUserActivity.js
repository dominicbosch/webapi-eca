'use strict';

// Requires modules: cheerio, needle <br>

// let cheerio = modules.cheerio;
// let needle = modules.needle;
let cheerio = require('cheerio');
let needle = require('needle');

let persistence = {};
function persist(){}

/* IMPORTANT! When using cheerio you need unealkString... */
function unleakString(s) { return (' ' + s).substr(1); }

if(!persistence.articles) {
	persistence.articles = {};
	persist();
}

exports.checkUrl = function(baseURI, hrefSelector) {
	needle.get(baseURI, function(err, resp) {
		if(err) log('Error fetching "'+url+'": '+err.message);
		else {
			let tree = cheerio.load(resp.body);
			let arrLinks = tree(hrefSelector);
			arrLinks.each(function() {
				getArticle(baseURI+unleakString(tree(this).attr('href')), '.vote');
				// getArticle(baseURI+unleakString(tree(this).attr('href')), '.comment_love', '.comment_hate');
			})
			// if(persistence.pageSnippet !== content) {
			// 	log('Change detected on "'+url+'"! now: '+content);
			// 	if(webhookname !== 'null') {
			// 		emitEvent(webhookname, { old: persistence.pageSnippet, now: content });
			// 	} else {
			// 		datalog({old: persistence.pageSnippet, now: content});
			// 	}
			// 	persistence.pageSnippet = content;
			// 	persist();
			// }
		}
	});
}

function getArticle(url, counterSelector) {
	needle.get(url, function(err, resp) {
		if(err) log('Error fetching "'+url+'": '+err.message);
		else {
			let tree = cheerio.load(resp.body);
			let arrLinks = tree(counterSelector);
			console.log(arrLinks);
		}
	});

}

exports.checkUrl('http://www.watson.ch/', '.storylink');
// interval on which the action checks the articles and stores the activity data
// every 30 mins
// setInterval(function() {
// 	isStillWorking = true;
// 	isStillWorking = false;
// }, 30*60*1000);




// <kbd>pollWebpage</kbd> polls a <kbd>url</kbd> and emits an event on the <kbd>webhookname</kbd>
// with the status if the status code changed. The emitted event has two properties:
// <ul>
//   <li><kbd>code</kbd>: the status code</li>
//   <li><kbd>message</kbd>: the status message</li>
// </ul>

// 20mins $('.teaser_image a').each(function(){ console.log($(this).attr('href'))})
// watson $('.storylink').each(function(){ console.log($(this).attr('href'))})


