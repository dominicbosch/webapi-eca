###
Push messages to Pushover
Requires user-specific params:

 - userKey
 - appKey


Valid sound arguments:

- pushover - Pushover (default)
- bike - Bike
- bugle - Bugle
- cashregister - Cash Register
- classical - Classical
- cosmic - Cosmic
- falling - Falling
- gamelan - Gamelan
- incoming - Incoming
- intermission - Intermission
- magic - Magic
- mechanical - Mechanical
- pianobar - Piano Bar
- siren - Siren
- spacealarm - Space Alarm
- tugboat - Tug Boat
- alien - Alien Alarm (long)
- climb - Climb (long)
- persistent - Persistent (long)
- echo - Pushover Echo (long)
- updown - Up Down (long)
- none - None (silent)
###

exports.broadcast = ( title, message, sound ) ->
	url = 'https://api.pushover.net/1/messages.json'
	if sound is ''
		sound = 'pushover'
	body =
		priority: 1
		title: title
		sound: sound
		token: params.appKey
		user: params.userKey
		message: message
	needle.post url, body, ( err, resp, body ) ->
		if body.status is 1
			log "successfully pushed message: " + title
		else
			log JSON.stringify body, null, 2