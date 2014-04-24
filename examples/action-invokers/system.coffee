
# Helper constructs
#

# Parses text to JSON
exports.parseTextToJSON = ( eventname, text ) ->
	try
		pushEvent
			event: eventname
			body: JSON.parse text
		log "Text successfully parsed"
	catch e
		log "Error during JSON parsing of #{ text }"


# Parses objects to text
exports.parseObjectToPrettyText = ( eventname, obj ) ->
	pushEvent
		event: eventname
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
			event: evtname
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
			event: eventname
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