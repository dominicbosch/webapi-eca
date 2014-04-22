### 
System information
------------------------
###

isRunning = false

###
This event is emitted if the system had a restart.
###
exports.hasRestarted = () ->
	if not isRunning
		isRunning = true
		pushEvent
			content: "The system has been restarted at #{ ( new Date ).toISOString() }"

