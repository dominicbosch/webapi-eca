### 
OpenWeather EVENT POLLER
------------------------

This module requires user-specific parameters:
- openweatherKey
- tempThreshold
- city
###
urlService = 'http://api.openweathermap.org/data/2.5/weather'


###
Fetches the temperature
###
getWeatherData = ( cb ) ->
	url = urlService + '?APPID=' + params.openweatherKey + '&q=' + params.city
	needle.request 'get', url, null, null, cb

###
Pushes the current weather data into the system
###
exports.currentData = () ->
	getWeatherData ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log JSON.stringify body
		else
			pushEvent body

###
Emits one event per day if the temperature today raises above user defined threshold
###
exports.temperatureOverThreshold = () ->
	getWeatherData ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			log JSON.stringify body
		else
			#If temperature is above threshold
			if body.main.temp_max - 272.15 > params.tempThreshold
				pushEvent
					threshold: params.tempThreshold
					measured: body.main.temp_max - 272.15

