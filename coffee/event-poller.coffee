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
logger = require './logging'
db = require './persistence'
dynmod = require './dynamic-modules'
encryption = require './encryption'

# If we do not receive all required arguments we shut down immediately
if process.argv.length < 8
	console.error 'Not all arguments have been passed!'
	process.exit()

# Fetch all the command line arguments to the process to init the logger
logconf =
	mode: process.argv[ 2 ]
	nolog: process.argv[ 6 ]
logconf[ 'io-level' ] = process.argv[ 3 ]
logconf[ 'file-level' ] = process.argv[ 4 ]
logconf[ 'file-path' ] = process.argv[ 5 ]
log = logger.getLogger logconf
log.info 'EP | Event Poller starts up'

process.on 'uncaughtException', ( err ) ->
	# TODO we'd have to wrap the dynamic-modules module in an own child process which
	# we could let crash, create log info about what dynamic module caused the crash and
	# then restart the dynamic-modules module, passing the crash info to the logger of the
	# rule that caused this issue. on the other hand we're just fine like this since only
	# the deferred token of the corresponding rule gets eliminated if it throws an error
	# and the event polling won't continue fo this rule, which is fine for us, except that
	# we do not have a good way to inform the user about his error.
	log.error 'Probably one of the event pollers produced an error!'

# Initialize required modules (should be in cache already)
db logger: log
dynmod
	logger: log

db.selectDatabase parseInt( process.argv[ 7 ] ) || 0
	
encryption
	logger: log
	keygen: process.argv[ 8 ]

# Initialize module local variables and 
listUserModules = {}
isRunning = true

# Register disconnect action. Since no standalone mode is intended
# the event poller will shut down
process.on 'disconnect', () ->
	log.info 'EP | Shutting down Event Poller'
	isRunning = false
	# very important so the process doesnt linger on when the paren process is killed  
	process.exit()

# If the process receives a message it is concerning the rules
process.on 'message', ( msg ) ->
	log.info "EP | Got info about new rule: #{ msg.event }"

	# Let's split the event string to find module and function in an array

	# A initialization notification or a new rule
	if msg.intevent is 'new' or msg.intevent is 'init'
		fLoadModule msg
		# We fetch the module also if the rule was updated

	# A rule was deleted
	if msg.intevent is 'del'
		delete listUserModules[msg.user][msg.ruleId]
		if JSON.stringify( listUserModules[msg.user] ) is "{}"
			delete listUserModules[msg.user]

# Loads a module if required
fLoadModule = ( msg ) ->
	arrName = msg.rule.eventname.split ' -> '
	fAnonymous = () ->
		db.eventPollers.getModule msg.user, arrName[ 0 ], ( err, obj ) ->
			if not obj
				log.info "EP | No module retrieved for #{ arrName[0] }, must be a custom event or Webhook"
			else
				 # we compile the module and pass: 
				dynmod.compileString obj.data,  # code
					msg.user,                     # userId
					msg.rule,                  	  # oRule
					arrName[0],                   # moduleId
					obj.lang,                     # script language
					"eventpoller",                # the module type
					db.eventPollers,              # the DB interface
					( result ) ->
						if not result.answ is 200
							log.error "EP | Compilation of code failed! #{ msg.user },
								#{ msg.rule.id }, #{ arrName[0] }"

						# If user is not yet stored, we open a new object
						if not listUserModules[msg.user]
							listUserModules[msg.user] = {}

						oUser = listUserModules[msg.user]
						# We open up a new object for the rule it
						oUser[msg.rule.id] =
							id: msg.rule.eventname
							timestamp: msg.rule.timestamp
							pollfunc: arrName[1]
							funcArgs: result.funcArgs
							eventinterval: msg.rule.eventinterval * 60 * 1000
							module: result.module
							logger: result.logger

						start = new Date msg.rule.eventstart
						nd = new Date()
						now = new Date()
						if start < nd
							# If the engine restarts start could be from last year even 
							nd.setMilliseconds 0
							nd.setSeconds 0
							nd.setMinutes start.getMinutes()
							nd.setHours start.getHours()
							# if it's still smaller we add one day
							if nd < now
								nd.setDate nd.getDate() + 1
						else
							nd = start
								
						log.info "EP | New event module '#{ arrName[0] }' loaded for user #{ msg.user },
							in rule #{ msg.rule.id }, registered at UTC|#{ msg.rule.timestamp },
							starting at UTC|#{ start.toISOString() } ( which is in #{ ( nd - now ) / 1000 / 60 } minutes )
							and polling every #{ msg.rule.eventinterval } minutes"
						setTimeout fCheckAndRun( msg.user, msg.rule.id, msg.rule.timestamp ), nd - now

	if msg.intevent is 'new' or
			not listUserModules[msg.user] or 
			not listUserModules[msg.user][msg.rule.id]
		fAnonymous()

fCheckAndRun = ( userId, ruleId, timestamp ) ->
	() ->
		log.info "EP | Check and run user #{ userId }, rule #{ ruleId }"
		if isRunning and 
				listUserModules[userId] and 
				listUserModules[userId][ruleId]
			# If there was a rule update we only continue the latest setTimeout execution
			if listUserModules[userId][ruleId].timestamp is timestamp	
				oRule = listUserModules[userId][ruleId]
				fCallFunction userId, ruleId, oRule
				setTimeout fCheckAndRun( userId, ruleId, timestamp ), oRule.eventinterval
			else
				log.info "EP | We found a newer polling interval and discontinue this one which
						was created at UTC|#{ timestamp }"

# We have to register the poll function in belows anonymous function
# because we're fast iterating through the listUserModules and references will
# eventually not be what they are expected to be
fCallFunction = ( userId, ruleId, oRule ) ->
	try
		arrArgs = []
		if oRule.funcArgs and oRule.funcArgs[oRule.pollfunc]
			for oArg in oRule.funcArgs[oRule.pollfunc]
				arrArgs.push oArg.value
		oRule.module[oRule.pollfunc].apply null, arrArgs
	catch err
		log.info "EP | ERROR in module when polled: #{ oRule.id } #{ userId }: #{err.message}"
		throw err
		oRule.logger err.message
###
This function will loop infinitely every 10 seconds until isRunning is set to false

@private pollLoop()
###
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

    #     # Call the event poller module function
    #     fCallFunction myRule, ruleName, userName

    setTimeout pollLoop, 10000


# Finally if everything initialized we start polling for new events
pollLoop()