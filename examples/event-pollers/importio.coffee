###
Import.io allows to capture data from the web
required module params:

- apikey
- userGuid
###

params.apikey = "Cc8AX35d4B89ozzmn5bpm7k70HRon5rrfUxZvOwkVRj31/oBGHzVfQSRp5mEvlOgxyh7xi+tFSL66iAFo1W/sQ=="
params.userGuid = "d19f0d08-bf73-4115-90a8-ac045ad4f225"

io = new importio params.userGuid, params.apikey, "query.import.io"

tryToConnect = ( numAttempt, cb ) ->
	io.connect ( connected ) ->
		if connected
			cb true
		else
			log "Unable to connect, attempting again... ##{ numAttempt++ }"
			if numAttempt is 5
				cb false
			else
				tryToConnect numAttempt, cb

arrPages = [
	"http://www.meteoblue.com/en/switzerland/weather-basel"
	"http://www.meteoblue.com/en/switzerland/weather-z%C3%BCrich"
	"http://www.meteoblue.com/en/switzerland/weather-luzern"
	"http://www.meteoblue.com/en/switzerland/weather-liestal"
	"http://www.meteoblue.com/en/switzerland/weather-bern"
	"http://www.meteoblue.com/en/switzerland/weather-lugano"
	"http://www.meteoblue.com/en/switzerland/weather-sankt-gallen"
]

getCityUrl = ( idCity ) ->
	id = parseInt( idCity ) || 0
	if id < 0 or id >= arrPages.length
		id = 0
	arrPages[ id ]

queryService = ( inputParams ) ->
	tryToConnect 0, ( connected ) ->
		if not connected
			log 'ERROR: Cannot execute query because connection failed!'
		else
			data = []
			io.query inputParams, ( finished, msg ) ->
				if msg.type is "MESSAGE"
					data = data.concat msg.data.results
				if finished
					log JSON.stringify data
					exports.pushEvent data

exports.meteoblueWeekData = ( idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "2a1d789a-4d24-4942-bdca-ffa0e9f99c85" ]
	queryService params
	# [ 
	# 	{
	# 		wind: '9 mph',
	#     day_identifier: 'Today',
	#     day_name: 'Mon',
	#     temp_max: '61 °F',
	#     temp_min: '50 °F',
	#     sunlight: '0 h',
	#     rain: '0-2mm'
	#   },
	#   [...]
	# ]

exports.meteoblueCurrentData = ( idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "06394265-b4e1-4b48-be82-a9f2acb9040f" ]
	queryService params
	# [
	# 	{
	# 		current_time_wind_desc: '01:00 | Overcast',
	#     current_temp: '53°F',
	#     coordinates: '47.56°N 7.59°E 260m asl',
	#     city: 'Basel-Stadt'
	#   }
	# ]
