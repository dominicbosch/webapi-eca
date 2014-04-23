###
Import.io allows to capture data from the web.
Here we grab prepared weather data from Meteoblue
Required module params:

- apikey
- userGuid
###

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

queryService = ( inputParams, cb ) ->
	tryToConnect 0, ( connected ) ->
		if not connected
			log 'ERROR: Cannot execute query because connection failed!'
		else
			data = []
			io.query inputParams, ( finished, msg ) ->
				if msg.type is "MESSAGE"
					data = data.concat msg.data.results
				if finished
					log 'Successfully queried data'
					cb data

exports.weekData = ( idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "2a1d789a-4d24-4942-bdca-ffa0e9f99c85" ]
	queryService params, ( data ) ->
		pushEvent data
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

exports.currentData = ( idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "06394265-b4e1-4b48-be82-a9f2acb9040f" ]
	queryService params, ( data ) ->
		pushEvent data
	# [
	# 	{
	# 		current_time_wind_desc: '01:00 | Overcast',
	#     current_temp: '53°F',
	#     coordinates: '47.56°N 7.59°E 260m asl',
	#     city: 'Basel-Stadt'
	#   }
	# ]


# Helper function to detect and convert temperatures
convertTemperature = ( text ) ->
	arrStr = text.split '°'
	if arrStr > 1
		val = parseFloat arrStr[ 0 ]
		if arrStr[ 1 ] is 'F'
			fahrenheit = val
			celsius = ( fahrenheit - 32 ) * 5 / 9
		else if arrStr[ 1 ] is 'C'
			celsius = val
			fahrenheit = ( celsius * 9 / 5 ) + 32
		else
			log "Unexpected temperature in #{ text }"

		celsius: celsius
		fahrenheit: fahrenheit
		kelvin: celsius - 273.15


# idCity, the city identifier corresponding to the arrPages array
exports.temperature = ( idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "06394265-b4e1-4b48-be82-a9f2acb9040f" ]
	queryService params, ( data ) ->
		pushEvent convertTemperature data[ 0 ].current_temp


# tempUnit: C, F or K for celsius, fahrenheit and kelvin
# the threshold above which we alert
# idCity, the city identifier corresponding to the arrPages array
exports.tempOverThreshold = ( tempUnit, tempThreshold, idCity ) ->
	params =
		input: "webpage/url": getCityUrl idCity
		connectorGuids: [ "06394265-b4e1-4b48-be82-a9f2acb9040f" ]
	queryService params, ( data ) ->
		oTemp = convertTemperature data[ 0 ].current_temp
		switch tempUnit
			when "K" then val = oTemp.kelvin
			when "F" then val = oTemp.fahrenheit
			else val = oTemp.celsius
		if val > parseFloat tempThreshold
			pushEvent oTemp