'use strict';

var needle = require('needle');

var urlService = 'http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&exchars=200&explaintext&titles=Computer%20science';
//http://www.mediawiki.org/wiki/API:Search
/*
 * 1. try to get title right away: http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&titles=Computer%20science
 * 		if success add it in comment, else issue search:
 * 2. http://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srwhat=text&srsearch=cs&srlimit=3
 * 		get snippets and add comments 
 * 
 */

function search(text) {
	var ret = requestTitle(text);
	if(!ret) ret = searchText(text); 
}

function requestTitle(title, cbDone, cbFail) {
  needle.get('http://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&exchars=200&explaintext&titles=' + encodeURI(title), 
    function handleResponse(error, response, body) {
      obj = JSON.parse(body);
      if(error || response.statusCode != 200 || !obj || !obj.query || !obj.query.pages || obj.query.pages['-1']) {
        searchText(title, cbDone, cbFail); 
      } else {
        var pgs = obj.query.pages;
        for(var el in pgs) console.log('found: ' + pgs[el].title);
      }
    }
  );
}

function searchText(text, cbDone, cbFail) {
  needle.get('http://en.wikipedia.org/w/api.php?format=json&action=query&list=search&srwhat=text&srlimit=3&srsearch=' + encodeURI(text), 
    function handleResponse(error, response, body) {
      obj = JSON.parse(body);
      if(error || response.statusCode != 200 || !obj || !obj.query || !obj.query.search || obj.query.search.length == 0) {
        console.log('nothing found for this tag');
        if(cbFail) cbFail('nothing found for this tag');
      } else {
        var srch = obj.query.search;
        for(var i = 0; i < srch.length; i++) {
          console.log('found: ' + srch[i].title + ' [' + srch[i].snippet + ']');
          if(cbDone) cbDone('found: ' + srch[i].title + ' [' + srch[i].snippet + ']'); 
        }
      }
    }
  );
  
}
