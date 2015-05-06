var fs = require( 'fs' ),
	needle = require( 'needle' );

if( process.argv.length < 3 ) {
	
}

remoteUrl = 'http://ec2-54-196-2-15.compute-1.amazonaws.com/webhook/'
fPushEvent = ( evt ) ->
	needle.post remoteUrl + '/measurements', JSON.stringify( evt ), ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			console.log 'Error in pushing event!'
			console.log err
			console.log resp.statusCode
		else
			console.log 'Successfully posted an event'

try
	histData = fs.readFileSync 'histoappend.json', 'utf8'
catch err
	console.error err
	console.error "Error reading historical data file"
	process.exit()

session = ping.createSession retries: 2
oSum = {}
if histData
	arrPings = histData.split "\n"
	try
		for strObj, i in arrPings
			if strObj isnt ''
				oTmp = JSON.parse strObj  
				oSum[ oTmp.timestamp ] = 
					sum: oTmp.sum
		if oTmp
			fPushEvent
				currentlyon: oSum[ oTmp.timestamp ].sum
				pingtimes: oSum		

	catch err
		console.log 'Error parsing histo data'
		console.log err

i = -1
ips = []
pingTime = (new Date()).toISOString()
fPollHosts = () ->
	i++
	# console.log "Pinging 131.152.85.#{ i }"
	session.pingHost "131.152.85.#{ i }", ( err, target, sent, rcvd ) ->
		if not err
			ips.push target
			
	if i is 255
		i = -1
		console.log "#{ (new Date()).toISOString() } | All ping requests returned (#{ips.length} answered), pushing event into the system and starting again at 0"
		
		oSum[ pingTime ] = sum: ips.length
		fPushEvent JSON.stringify
			currentlyon: ips.length
			pingtimes: oSum

		oPing = 
			timestamp: pingTime
			ips: ips
			sum: ips.length

		fs.appendFile 'histoappend.json', JSON.stringify( oPing ) + "\n", 'utf8'
		pingTime = (new Date()).toISOString()
		ips = []


	setTimeout fPollHosts, 7000


fPollHosts()

