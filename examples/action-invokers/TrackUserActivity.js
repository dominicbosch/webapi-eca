'use strict';

let cheerio = modules.cheerio;
let needle = modules.needle;
let oArticles = {};
let isStillWorking = false;

// Receives new articles to watch
exports.newArticle = function(url, csspathToCount) {
	
};

// interval on which the action checks the articles and stores the activity data
// every 30 mins
setInterval(function() {
	isStillWorking = true;
	isStillWorking = false;
}, 30*60*1000);
