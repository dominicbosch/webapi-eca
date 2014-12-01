
fetchPage = ( url, cb ) ->
	request url, ( error, response, html ) ->
		cb error, cheerio.load html

		
exports.getWikipediaTocArray = ( url ) ->
	fetchPage url, ( err, tree ) ->
		fMap = ( id, el ) ->
			tree( this ).text()
		pushEvent tree( "#toc li a" ).map( fMap ).get()

oldArr = []
exports.detectWikipediaTocDelta = ( url ) ->
	fetchPage url, ( err, tree ) ->
		fMap = ( id, el ) ->
			tree( this ).text()
		arr = tree( "#toc li a" ).map( fMap ).get()
		for title, i in arr
			if oldArr[ i ] != title
				oldArr = arr
				pushEvent
					differenceAtIndex: i
					newToc: arr
					newTocCSV: arr.join ','
				return
