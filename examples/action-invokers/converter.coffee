
# Helper constructs
#

exports.replaceText = ( eventname, text, find, replace ) ->
	re = new RegExp find, "g"
	pushEvent
		eventname: eventname
		body: text.replace re, replace
	log "replaceText completed finding '#{ find }'"
	

# Parses text to JSON
exports.parseTextToJSON = ( eventname, text ) ->
	try
		pushEvent
			eventname: eventname
			body: JSON.parse text
		log "Text successfully parsed"
	catch e
		log "Error during JSON parsing of #{ text }"
		log e.message


# Parses objects to text
exports.parseObjectToPrettyText = ( eventname, obj ) ->
	pushEvent
		eventname: eventname
		body: JSON.stringify text, undefined, 2


lastSend = null
arrEvents = []
exports.accumulateEvents = ( evtname, evt, sendTime ) ->
	arrEvents.push evt
	sTime = fConvertTimeStringToDate sendTime
	yesterday = new Date()
	yesterday.setDate sTime.getDate() - 1
	if lastSend < yesterday
		lastSend = sTime
		pushEvent
			eventname: evtname
			body: arrEvents
		arrEvents = []


# Changes the speed on how often a event is pushed into the system
isRunning = false
interval = 10 * 60 * 1000
eventname = ''
event = {}
exports.changeEventSpeed = ( evtname, evt, startTime, intervalMins ) ->
	eventname = evtname
	event = evt
	start = fConvertTimeStringToDate startTime
	mins = parseInt( intervalMins ) || 10
	interval = mins * 60 * 1000
	if not isRunning
		isRunning = true
		now = new Date()
		setTimeout fPushEvent, start.getTime() - now.getTime()


fPushEvent = () ->
	if eventname isnt ''
		log "Pushing changed interval event"
		pushEvent
			eventname: eventname
			body: event
	setTimeout fPushEvent, interval
	

fConvertTimeStringToDate = ( text ) ->
	start = new Date()
	if not text
		start.setHours 12
		start.setMinutes 0
	else
		arrInp = text.split ':'
		# There's only one string entered: hour
		if arrInp.length is 1
			txtHr = text
			start.setMinutes 0
		else
			txtHr = arrInp[ 0 ]
			intMin = parseInt( arrInp[ 1 ] ) || 0
			m = Math.max 0, Math.min intMin, 59
			start.setMinutes m
	
	intHour = parseInt( txtHr ) || 12
	h = Math.max 0, Math.min intHour, 24
	start.setHours h

	start.setSeconds 0
	start.setMilliseconds 0
	if start < new Date()
		start.setDate start.getDate() + 1
	start

degToRad = ( deg ) ->
	deg * Math.PI / 180

exports.LongLatToMeterDistance = ( latOne, longOne, latTwo, longTwo, eventname ) ->
	earthRadius = 3958.75
	latOne = parseFloat latOne
	longOne = parseFloat longOne
	latTwo = parseFloat latTwo
	longTwo = parseFloat longTwo
	if isNaN latOne or isNaN longOne or isNaN latTwo or isNaN longTwo
		log "Illegal values detected in yur given parameters:
			#{ latOne }, #{ longOne }, #{ latTwo }, #{ longTwo }"
		return
	dLat = degToRad latTwo - latOne 
	dLng = degToRad longTwo - longOne
	a = Math.sin( dLat / 2 ) * Math.sin( dLat / 2 ) +
			Math.cos( degToRad latOne ) * Math.cos( degToRad latTwo ) *
			Math.sin( dLng / 2 ) * Math.sin( dLng / 2 )
	c = 2 * Math.atan2 Math.sqrt( a ), Math.sqrt 1 - a
	
	pushEvent
		eventname: eventname
		body:
			latOne: latOne
			longOne: longOne
			latTwo: latTwo
			longTwo: longTwo
			distance: earthRadius * c * 1609 # meter conversion
