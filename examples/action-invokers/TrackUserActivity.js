'use strict';

// Requires modules: cheerio, needle <br>

// let cheerio = modules.cheerio;
// let needle = modules.needle;
let cheerio = require('cheerio');
let needle = require('needle');

let persistence = {};
function persist(){}
function datalog(){}

/* IMPORTANT! When using cheerio you need unealkString... */
function unleakString(s) { return (' ' + s).substr(1); }

if(!persistence.articles) {
	persistence.articles = {};
	persist();
}
let articles = persistence.articles;

exports.checkWatson = function() {
	let baseURI = 'http://www.watson.ch/';
	let hrefSelector = '.teaser';

	needle.get(baseURI, function(err, resp) {
		if(err) console.log('Error fetching "'+baseURI+'": '+err.message);
		else {
			let tree = cheerio.load(resp.body);
			let arrLinks = tree(hrefSelector);
			arrLinks.each(function(i) {
				var id = unleakString(tree(this).attr('data-story-id'));
				if(id) {
					if(!articles[id]) {
						articles[id] = {
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
// GET /api/1.0/comments.json?html=1&id=431211413&sort=newest&page=1&limit=6 HTTP/1.1
// Host: www.watson.ch
// Connection: keep-alive
// Accept: */*
// X-Requested-With: XMLHttpRequest
// User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/49.0.2623.108 Chrome/49.0.2623.108 Safari/537.36
// Referer: http://www.watson.ch/Wirtschaft/Lifestyle/431211413-Der-Neoliberalismus-hat-ein-neue-politisches-Monster-gezeugt--Das-Prekariat
// Accept-Encoding: gzip, deflate, sdch
// Accept-Language: en-US,en;q=0.8,de;q=0.6
// Cookie: feSid=64e0ece70279544d210f31b6e510269a; POPUPCHECK=1461136024396; _cb_ls=1; wUAC=6; _ga=GA1.2.478386245.1461049619; _gat=1; ga_events=%5B%5D; wUFC=1461049597-1461052556-16-1; user_read_rs0=eJxjYGBwYGGAAgUw6cDAyNDAwAznM4EZIDEwEHBgaGCBqwcAU8kC4A%3D%3D; fePlx=PY19FPjnQgZH9tvIYzQs5eyhPcWTsHFUlmwFrVeauDzwEpr801jKVTXgvOcBiNi0NGrGMtN5wO55ac8O5DRrTiOR%2BTvTLZRMoVfQp5fmxPGoM9myoeeIkYWEKBN3QhCN; _chartbeat2=Cdn2_DBWME6LffDnd.1461049639214.1461052561015.1; _chartbeat5=


function getComments(id) {
	console.log('fetching article '+id);
	needle.get('www.watson.ch/api/1.0/comments.json?id='+id, function(err, resp) {
		if(err) console.log('Error fetching article id "'+id+'": '+err.message);
		else {
			try {
				let oArticle = JSON.parse(resp.body);
				let arrComm = oArticle.items.Comments;	// the new comments from the webapi
				let oComm = articles[id].comments;		// the existing comments, internal storage
				let ts = (new Date()).getTime();
				articles[id].numComments.push({
					timestamp: ts,
					num: oComm.length
				})
				console.log('article', id, 'has', oComm.length, 'comments');
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
			} catch(e) { console.log(e) }
		}
	});

}

exports.checkWatson();


// 20mins $('.teaser_image a').each(function(){ console.log($(this).attr('href'))})
// watson $('.storylink').each(function(){ console.log($(this).attr('href'))})


