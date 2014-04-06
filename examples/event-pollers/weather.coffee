### 
OpenWeather EVENT POLLER
------------------------

This module requires user-specific parameters:
- openweatherKey
- tempThreshold
- city
- eventTime ( hh:mm of the day )
###
urlService = 'http://api.openweathermap.org/data/2.5/weather'
lastEvent = new Date 0
twentyFourHoursInms = 24 * 60 * 60 * 1000
dayTimeInMin = 0

calcEventDayTimeInMin = ( et ) ->
	arrTime = et.split ':'
	hrs = parseInt arrTime[ 0 ]
	mins = parseInt arrTime[ 1 ]
	dayTimeInMin = hrs * 60  + mins
	if isNaN dayTimeInMin
		log 'Wrong temperature input! ' + et

try
    calcEventDayTimeInMin params.eventTime
catch err
   log 'Unable to parse the eventTime parameter'


###
Fetches the temperature
###
getTemperature = ( cb ) ->
	url = urlService + '?APPID=' + params.openweatherKey + '&q=' + params.city
	needlereq 'get', url, null, null, cb

###
Emits one event per day if the temperature today raises above user defined threshold
###
exports.temperatureOverThreshold = ( pushEvent ) ->
	getTemperature ( err, resp, body ) ->
		timeNow = new Date()

		if err or resp.statusCode isnt 200
			debug body
		else
			#If temperature is above threshold
			if body.main.temp_max - 272.15 > params.tempThreshold and 

					# If last event was more than 24 hours ago
					timeNow - lastEvent > twentyFourHoursInms and

					# If we are past the time the user wants to get the information
					timeNow.getHours() * 60 + timeNow.getMinutes() > dayTimeInMin

				lastEvent = timeNow
				pushEvent
					threshold: params.tempThreshold
					measured: body.main.temp_max - 272.15
					content: "The temperature will be #{ body.main.temp_max - 272.15 } today!"

