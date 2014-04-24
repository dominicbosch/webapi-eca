fs = require 'fs'
# libnmap = require 'node-libnmap'
ping = require 'net-ping'
# request = require 'request'
needle = require 'needle'
		

# remoteUrl = "localhost:8125"
remoteUrl = "http://ec2-54-226-188-9.compute-1.amazonaws.com:8126"
fPushEvent = ( evt ) ->
	needle.post remoteUrl + '/webhooks/uptimestatistics', JSON.stringify( evt ), ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			console.log 'Error in pushing event!'
		else
			console.log 'Successfully posted an event'

try
	# arrHosts = JSON.parse fs.readFileSync 'hostlist.json', 'utf8'
	histData = JSON.parse fs.readFileSync 'histochart.json', 'utf8'
catch err
	console.error err
	console.error "Error reading historical data file"
	process.exit()


# console.log arrHosts
# libnmap.nmap 'scan',
# 	range: arrHosts,
# 	callback: ( err, report ) ->
# 		if err
# 			console.log err
# 		else
# 	    report.forEach ( item ) ->
# 	      console.log item[ 0 ]

session = ping.createSession retries: 2
everyMins = 10
oHosts = {}
oPings = {}
i = -1
if histData
	oHosts = histData.hosts
	oPings = histData.pingtimes
pingTime = (new Date()).toISOString()
oPings[ pingTime ] = ips: []
fPollHosts = () ->
	i++
	console.log "Pinging 131.152.85.#{ i }"
	session.pingHost "131.152.85.#{ i }", ( err, target, sent, rcvd ) ->
		if not err
			if not oHosts[ target ]
				oHosts[ target ] = {}
			oHosts[ target ][ pingTime ] = (new Date( rcvd - sent )).getTime()
			oPings[ pingTime ].ips.push target
			
	if i is 255
		i = -1
		console.log 'All ping requests returned, pushing event into the system and starting again at 0'
		oPings[ pingTime ].sum = oPings[ pingTime ].ips.length
		evt = 
			currentlyon: oPings[ pingTime ].ips.length
			pingtimes: oPings
			hosts: oHosts
		fPushEvent evt
		fs.writeFile 'histochart.json', JSON.stringify( evt, undefined, 2 ), 'utf8'
		pingTime = (new Date()).toISOString()
		oPings[ pingTime ] = ips: []


	setTimeout fPollHosts, 7000


fPollHosts()

# Some pings eventually get blocked if you ping 255 IPs within one second...
#
# fPollHosts = () ->
# 	semaphore = arrHosts.length
# 	pingTime = (new Date()).toISOString()
# 	oPings[ pingTime ] = ips: []
# 	for host in arrHosts
# 		session.pingHost host, ( err, target, sent, rcvd ) ->
# 			if not err
# 				if not oHosts[ target ]
# 					oHosts[ target ] = {}
# 				oHosts[ target ][ pingTime ] = (new Date( rcvd - sent )).getTime()
# 				oPings[ pingTime ].ips.push target

# 			if --semaphore is 0
# 				console.log 'All ping requests returned, pushing event into the system'
# 				oPings[ pingTime ].sum = oPings[ pingTime ].ips.length
# 				evt = 
# 					currentlyon: oPings[ pingTime ].ips.length
# 					pingtimes: oPings
# 					hosts: oHosts
# 				fPushEvent evt
# 				fs.writeFile 'histochart.json', JSON.stringify( evt, undefined, 2 ), 'utf8'

# 				console.log "Pinging again in #{ everyMins } minutes"
# 				setTimeout fPollHosts, everyMins * 60 * 1000
