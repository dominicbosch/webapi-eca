'use strict';


function log() {
	console.log(arguments);
}
function persist() {}
function datalog() {}
let persistence = {}
let modules = {
	cheerio: require('cheerio'),
	needle: require('needle')
}




// Requires modules: cheerio, needle <br>

let cheerio = modules.cheerio;
let needle = modules.needle;

/* IMPORTANT! When using cheerio you need unealkString... */
function unleakString(s) { return (' ' + s).substr(1); }

if(!persistence.articles) {
	persistence.articles = {};
	persist();
}
let articles = persistence.articles;

exports.checkArticles = function() {
	let baseURI = 'http://www.watson.ch/';
	let hrefSelector = '.teaser';

	needle.get(baseURI, function(err, resp) {
		if(err) log('Error fetching "'+baseURI+'": '+err.message);
		else {
			let tree = cheerio.load(resp.body);
			let arrLinks = tree(hrefSelector);
			arrLinks.each(function(i) {
				let id = unleakString(tree(this).attr('data-story-id'));
				if(id !== 'undefined') {
					if(!articles[id]) {
						articles[id] = {
							id: id,
							href: tree('.storylink',this).attr('href'),
							showup: (new Date()).getTime(),
							comments: {},
							numComments: []
						};
					}
					if(!articles[id].ended) {
						if((new Date()).getTime() - articles[id].showup > 5*24*60*60*1000) {
							articles[id].ended = true; // We only track changes for five days
						} else {
							// random delay up to five minutes to spread the requests a bit over time
							setTimeout(function() { getComments(id) }, Math.random()*5*60*1000);
						}
					}
				}
			})
		}
	});
}

function getComments(id, retry) {
	if(retry) log('Retrying article '+id);
	needle.get('www.watson.ch/api/1.0/comments.json?id='+id, function(err, resp) {
		if(err) log('Error fetching article id "'+id+'": '+err.message);
		else {
			try {
				let arrComm = resp.body.items.Comments;	// the new comments from the webapi
				let oComm = articles[id].comments;		// the existing comments, internal storage
				let ts = (new Date()).getTime();
				articles[id].numComments.push({
					timestamp: ts,
					num: arrComm.length
				})
				for (var i = 0; i < arrComm.length; i++) {
					if(!oComm[arrComm[i].id]) {
						oComm[arrComm[i].id] = [];
					}
					oComm[arrComm[i].id].push({
						timestamp: ts,
						upvotes: arrComm[i].love,
						downvotes: arrComm[i].hate
					})
				}
				datalog(articles[id]);
				persist();
			} catch(e) {
				log(id+': '+e);
				if(!retry) getComments(id, true);
			}
	}
	});

}


// 20mins $('.teaser_image a').each(function(){ log($(this).attr('href'))})
// watson $('.storylink').each(function(){ log($(this).attr('href'))})


exports.checkWatson();


