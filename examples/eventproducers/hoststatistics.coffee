fs = require 'fs'
# libnmap = require 'node-libnmap'
ping = require 'net-ping'
request = require 'request'

try
	arrHosts = JSON.parse fs.readFileSync 'hostlist.json', 'utf8'
catch err
	console.error "Error reading host list file"
	process.exit()

remoteUrl = "http://ec2-54-226-188-9.compute-1.amazonaws.com:8126"

# console.log arrHosts
# libnmap.nmap 'scan',
# 	range: arrHosts,
# 	callback: ( err, report ) ->
# 		if err
# 			console.log err
# 		else
# 	    report.forEach ( item ) ->
# 	      console.log item[ 0 ]

session = ping.createSession()
everyMins = 10
oHosts = {}
oPings = {}
fPollHosts = () ->
	semaphore = arrHosts.length
	pingTime = (new Date()).toISOString()
	oPings[ pingTime ] = ips: []
	for host in arrHosts
		session.pingHost host, ( err, target, sent, rcvd ) ->
			if not err
				if not oHosts[ target ]
					oHosts[ target ] = {}
				oHosts[ target ][ pingTime ] = (new Date( rcvd - sent )).getTime()
				oPings[ pingTime ].ips.push target
				
			if --semaphore is 0
				console.log 'All ping requests returned, pushing event into the system'
				oPings[ pingTime ].sum = oPings[ pingTime ].ips.length
				fPushEvent
					currentlyon: oPings[ pingTime ].ips.length
					pingtimes: oPings
					hosts: oHosts

				console.log "Pinging again in #{ everyMins } minutes"
				setTimeout fPollHosts, everyMins * 60 * 1000

fPollHosts()


options =
	method: 'POST'
	json: true
	jar: true

fPushEvent = ( evt ) ->
	options.url = remoteUrl + '/webhooks/uptimestatistics'
	options.body = JSON.stringify evt
	request options, ( err, resp, body ) ->
		if err or resp.statusCode isnt 200
			console.log 'Error in pushing event!'
		else
			console.log 'Successfully posted an event'

