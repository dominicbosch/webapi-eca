oldPicture = ''

exports.checkForChange = ( url, tag ) ->
	request url, ( error, response, html ) ->
		if !error && response.statusCode == 200
			domTree = cheerio.load html
			newPicture = domTree( tag ).attr 'src'
			if oldPicture != newPicture
				pushEvent src: newPicture
			oldPicture = newPicture
			
			
getElement = ( url, startSelector, parentSelector, childSelector, cb ) ->
	log 'getElement'
	request url, ( error, response, html ) ->
		log 'got response'
		if !error && response.statusCode == 200
			domTree = cheerio.load html
			log 'got answer'

			cb domTree( startSelector )
				.closest( parentSelector )
				.children( childSelector )
			
getElementAttribute = ( url, startSelector, parentSelector, childSelector, attribute, cb ) ->
	getElement url, startSelector, parentSelector, childSelector, ( el ) ->
		cb el.attr attribute

exports.getAttributeValue = ( url, startSelector, parentSelector, childSelector, attribute ) ->
	getElementAttribute url, startSelector, parentSelector, childSelector, attribute, ( val ) ->
		pushEvent
			attrName: attribute
			attrVal: val

exports.getTagContent = ( url, startSelector, parentSelector, childSelector ) ->
	getElement url, startSelector, parentSelector, childSelector, ( el ) ->
		log 'weee'
		log el
		log el.first()
		log el.first().text()
		pushEvent
			text: el.first().text()
			