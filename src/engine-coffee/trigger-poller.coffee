###

Dynamic Modules
===============
> Compiles CoffeeScript modules and loads JS modules in a VM, together
> with only a few allowed node.js modules.
###

# **Loads Modules:**

# - [Logging](logging.html), [Persistence](persistence.html),
# [Encryption](encryption.html)
# and [Dynamic Modules](dynamic-modules.html)
log = require './logging'
dynmod = require './dynamic-modules'
encryption = require './encryption'

init = ( args ) ->
	# If we do not receive all required arguments we shut down immediately
	if not args
		console.error 'Not all arguments have been passed!'
		process.exit()

	log.init args
	log.info 'TP | Event Trigger Poller starts up'

	process.on 'uncaughtException', ( err ) ->
		log.error 'CURRENT STATE:'
		log.error JSON.stringify @currentState, null, 2
		# TODO we'd have to wrap the dynamic-modules module in an own child process which
		# we could let crash, create log info about what dynamic module caused the crash and
		# then restart the dynamic-modules module, passing the crash info to the logger of the
		# rule that caused this issue. on the other hand we're just fine like this since only
		# the deferred token of the corresponding rule gets eliminated if it throws an error
		# and the event polling won't continue fo this rule, which is fine for us, except that
		# we do not have a good way to inform the user about his error.
		log.error 'Probably one of the Event Triggers produced an error!'
		log.error err

	# Initialize required modules (should be in cache already)
	encryption.init args.keygenpp

# Initialize module local variables and 
listUserModules = {}
isRunning = true

# Register disconnect action. Since no standalone mode is intended
# the event Trigger poller will shut down
process.on 'disconnect', () ->
	console.log 'gong home'
	log.warn 'TP | Shutting down Event Trigger Poller'
	isRunning = false
	# very important so the process doesnt linger on when the paren process is killed  
	process.exit()

# If the process receives a message it is concerning the rules
process.on 'message', ( msg ) ->
	if msg.intevent is 'startup'
		init msg.data

	log.info "TP | Got info about new rule: #{ msg.intevent }"
	# Let's split the event string to find module and function in an array

	# A initialization notification or a new rule
	if msg.intevent is 'new' or msg.intevent is 'init'
		requestModule msg
		# We fetch the module also if the rule was updated

# TODO if server restarts we would have to start modules in the interval
# that they were initially meant to (do not wait 24 hours until starting again)

	# A rule was deleted
	if msg.intevent is 'del'
		delete listUserModules[msg.user][msg.ruleId]
		if JSON.stringify( listUserModules[msg.user] ) is "{}"
			delete listUserModules[msg.user]

# Loads a module if required
requestModule = ( msg ) ->
	arrName = msg.rule.eventname.split ' -> '
	if msg.intevent is 'new' or
			not listUserModules[ msg.user ] or 
			not listUserModules[ msg.user ][ msg.rule.id ]
				# // FIXME This needs to be message passing to the mother process
		process.send
			command: 'get-ep'
			user: msg.user
			module: arrName[0]
		db.eventTriggers.getModule msg.user, arrName[ 0 ], ( err, obj ) ->
			if not obj
				log.info "TP | No module retrieved for #{ arrName[ 0 ] }, must be a custom event or Webhook"
			else
				 # we compile the module and pass:
				args =
					src: obj.data,					# code
					lang: obj.lang,					# script language
					userId: msg.user,				# userId
					modId: arrName[0],				# moduleId
					modType: 'eventtrigger'		# module type
					oRule: msg.rule,			# oRule
				dynmod.compileString args, ( result ) ->
						if not result.answ is 200
							log.error "TP | Compilation of code failed! #{ msg.user },
								#{ msg.rule.id }, #{ arrName[ 0 ] }"

						# If user is not yet stored, we open a new object
						if not listUserModules[ msg.user ]
							listUserModules[ msg.user ] = {}

						oUser = listUserModules[ msg.user ]
						# We open up a new object for the rule it
						oUser[ msg.rule.id ] =
							id: msg.rule.eventname
							timestamp: msg.rule.timestamp
							pollfunc: arrName[ 1 ]
							funcArgs: result.funcArgs
							eventinterval: msg.rule.eventinterval * 60 * 1000
							module: result.module
							logger: result.logger

						if msg.rule.eventstart
							start = new Date msg.rule.eventstart
						else
							start = new Date msg.rule.timestamp
						nd = new Date()
						now = new Date()
						if start < nd
							# If the engine restarts start could be from last year even 
							nd.setMilliseconds 0
							nd.setSeconds start.getSeconds()
							nd.setMinutes start.getMinutes()
							nd.setHours start.getHours()
							# if it's still smaller we add one day
							if nd < now
								log.info 'SETTING NEW INTERVAL: ' + (nd.getDate() + 1)
								nd.setDate nd.getDate() + 1
						else
							nd = start
								
						log.info "TP | New event module '#{ arrName[ 0 ] }' loaded for user #{ msg.user },
							in rule #{ msg.rule.id }, registered at UTC|#{ msg.rule.timestamp },
							starting at UTC|#{ start.toISOString() } ( which is in #{ ( nd - now ) / 1000 / 60 } minutes )
							and polling every #{ msg.rule.eventinterval } minutes"
						if msg.rule.eventstart
							setTimeout fCheckAndRun( msg.user, msg.rule.id, msg.rule.timestamp ), nd - now
						else
							fCheckAndRun msg.user, msg.rule.id, msg.rule.timestamp


fCheckAndRun = ( userId, ruleId, timestamp ) ->
	() ->
		log.info "TP | Check and run user #{ userId }, rule #{ ruleId }"
		if isRunning and 
				listUserModules[ userId ] and 
				listUserModules[ userId ][ ruleId ]
			# If there was a rule update we only continue the latest setTimeout execution
			if listUserModules[ userId ][ ruleId ].timestamp is timestamp	
				oRule = listUserModules[ userId ][ ruleId ]
				try
					fCallFunction userId, ruleId, oRule
				catch e
					log.error 'Error during execution of poller'
				
				setTimeout fCheckAndRun( userId, ruleId, timestamp ), oRule.eventinterval
			else
				log.info "TP | We found a newer polling interval and discontinue this one which
						was created at UTC|#{ timestamp }"

# We have to register the poll function in belows anonymous function
# because we're fast iterating through the listUserModules and references will
# eventually not be what they are expected to be
fCallFunction = ( userId, ruleId, oRule ) ->
	try
		arrArgs = []
		if oRule.funcArgs and oRule.funcArgs[ oRule.pollfunc ]
			for oArg in oRule.funcArgs[ oRule.pollfunc ]
				arrArgs.push oArg.value
		@currentState =
			rule: ruleId
			func: oRule.pollfunc
			user: userId
		oRule.module[ oRule.pollfunc ].apply this, arrArgs
	catch err
		log.info "TP | ERROR in module when polled: #{ oRule.id } #{ userId }: #{err.message}"
		throw err
		oRule.logger err.message
###
This function will loop infinitely every 10 seconds until isRunning is set to false

@private pollLoop()
###
console.log 'Do we really need a poll loop in the trigger poller?'
pollLoop = () ->
  # We only loop if we're running
  if isRunning
  	#FIXME CHECK IF ALREADY RUNNING!

  	#FIXME a scheduler should go here because we are limited in setTimeout
  	# to an integer value -> ~24 days at maximum!


    # # Go through all users
    # for userName, oRules of listUserModules

    #   # Go through each of the users modules
    #   for ruleName, myRule of oRules

    #     # Call the event Trigger poller module function
    #     fCallFunction myRule, ruleName, userName

    setTimeout pollLoop, 10000


# Finally if everything initialized we start polling for new events
pollLoop()