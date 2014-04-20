###
Import.io allows to capture data from the web
required module params:

- apikey
- userGuid
- queryGuid
###

params.apikey = "Cc8AX35d4B89ozzmn5bpm7k70HRon5rrfUxZvOwkVRj31/oBGHzVfQSRp5mEvlOgxyh7xi+tFSL66iAFo1W/sQ=="
params.userGuid = "d19f0d08-bf73-4115-90a8-ac045ad4f225"
params.queryGuid = "2a1d789a-4d24-4942-bdca-ffa0e9f99c85"
params.queryGuid = "2a1d789a-4d24-4942-bdca-ffa0e9f99c85"
# params.queryGuid = "4f833315-7aa0-4fcd-b8d0-c65f6a6bafcf"

io = new importio params.userGuid, params.apikey, "query.import.io"

exports.queryData = ( pushEvent ) ->
	debug params.apikey
	debug params.queryGuid
	debug params.userGuid

	io.connect ( connected ) ->
		if not connected
			log "ERROR: Unable to connect"
		else
			log "Connected!"
			data = []
			inp = { "webpage/url": "http://www.meteoblue.com/en/switzerland/weather-sankt-gallen" }
			io.query "input": inp, "connectorGuids": [ params.queryGuid ], ( finished, msg ) ->
				log 'query returned'
				log msg
				if msg.type is "MESSAGE"
					log "Adding #{ msg.data.results.length } results"
					data = data.concat msg.data.results
				if finished
					log "Done"
					log JSON.stringify data
				log 'all work done'
				log io
				io = null
  io.query({
    "connectorGuids": [
      "2a1d789a-4d24-4942-bdca-ffa0e9f99c85"
    ],
    "input": {
      "webpage/url": "http://www.meteoblue.com/en/switzerland/weather-sankt-gallen"
    }
  }, getCallbackFunction());