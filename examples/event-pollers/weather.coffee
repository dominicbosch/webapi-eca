### 
OpenWeather EVENT POLLER
------------------------

This module requires user-specific parameters:
- appid
###
urlService = 'http://api.openweathermap.org/data/2.5/weather'


###
Fetches the temperature
###
getWeatherData = ( city, cb ) ->
	url = urlService + '?APPID=' + params.appid + '&q=' + params.city
	needle.request 'get', url, null, null, cb

###
Pushes the current weather data into the system
###
exports.currentData = ( city ) ->
	getWeatherData city, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log JSON.stringify body
		else
			pushEvent body

###
Emits one event per day if the temperature today raises above user defined threshold
###
exports.temperatureOverThreshold = ( city, tempThreshold ) ->
	getWeatherData city, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log JSON.stringify body
		else
			#If temperature is above threshold
			if body.main.temp_max - 272.15 > tempThreshold
				pushEvent
					threshold: tempThreshold
					measured: body.main.temp_max - 272.15

