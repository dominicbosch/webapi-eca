
# Logging
# =======
# A Helper to handle the logging throughout the application. It uses
# [bunyan](https://github.com/trentm/node-bunyan) which allows for different streams
# to be attached to different log levels. [bunyan](https://github.com/trentm/node-bunyan)
# creates JSON entries for each log action. The bunyan module can then be used as a
# CLI to pretty print these logs, e.g.:

# `node myapp.js | bunyan`

# **Loads Modules:**

# - Node.js Module: [fs](http://nodejs.org/api/fs.html) and [path](http://nodejs.org/api/path.html)
fs = require 'fs'
path = require 'path'

# - External Module: [bunyan](https://github.com/trentm/node-bunyan)
bunyan = require 'bunyan'

exports = module.exports = 
	trace: () ->
	debug: () ->
	info: () ->
	warn: () ->
	error: () ->
	fatal: () ->
	init: ( args ) ->
		# `args` holds the configuration settings for the logging, see either CLI arguments
		# in [webapi-eca](webapi-eca.html) or the configuration parameters in [config](config.html).
		# We need to check for string 'true' also since the cliArgs passed to
		# the event-trigger will be strings
		if args.log.nolog
			# if the user doesn't want to have a log at all (e.g. during tests), it can be omitted with
			# the nolog flag
			delete exports.init
		else
			try
				opt =
					name: 'webapi-eca'
				# if we are in development mode, we also add information about where the call came from
				# this should be turned off in productive mode since it slows down the logging.
				if args.log.trace is 'on'
					opt.src = true
				# if there's a custom path defined for the log, we adopt the setting.
				if args.log.filepath
					logPath = path.resolve args.log.filepath
				else
					logPath = path.resolve __dirname, '..', '..', 'logs', 'server.log'

				# We try to write a temp file in the same folder to check if the log can be written
				try
					fs.writeFileSync logPath + '.temp', 'temp'
					fs.unlinkSync logPath + '.temp'
				catch e
					console.error "Log folder '#{ logPath }' is not writable"
					return

				# We attach two streams, one for the I/O and one for the log file.
				# The log levels are defined per stream according to the CLI args.log or the configuration.
				opt.streams = [
					{
						level: args.log.stdlevel
						stream: process.stdout
					},
					{
						level: args.log.filelevel
						path: logPath
					}
				]
				# Finally we create the bunyan logger and set it as the interface to this module

				for prop, func of bunyan.createLogger opt
					exports[ prop ] = func
				delete exports.init

			# If something goes wrong we print the error and return an empty logger.
			catch e
				console.error e
				delete exports.init
