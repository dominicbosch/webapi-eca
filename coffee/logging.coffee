
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

###
Returns a bunyan logger according to the given arguments.

@public getLogger( *args* )
@param {Object} args
###
exports.getLogger = ( args ) =>
	emptylog =
		trace: () ->
		debug: () ->
		info: () ->
		warn: () ->
		error: () ->
		fatal: () ->
	# `args` holds the configuration settings for the logging, see either CLI arguments
	# in [webapi-eca](webapi-eca.html) or the configuration parameters in [config](config.html).
	args = args ? {}
	# We need to check for string 'true' also since the cliArgs passed to
	# the event-poller will be strings
	if args.nolog is true or  args.nolog is 'true'
		# if the user doesn't want to have a log at all (e.g. during tests), it can be omitted with
		# the nolog flag
		emptylog
	else
		try
			opt =
				name: "webapi-eca"
			# if we are in development mode, we also add information about where the call came from
			# this should be turned off in productive mode since it slows down the logging.
			if args['mode'] is 'development'
				opt.src = true
			# if there's a custom path defined for the log, we adopt the setting.
			if args['file-path']
				@logPath = path.resolve args['file-path']
			else
				@logPath = path.resolve __dirname, '..', 'logs', 'server.log'

			# We try to write a temp file in the same folder to check if the log can be written
			try
				fs.writeFileSync @logPath + '.temp', 'temp'
				fs.unlinkSync @logPath + '.temp'
			catch e
				console.error "Log folder '#{ @logPath }' is not writable"
				return emptylog

			# We attach two streams, one for the I/O and one for the log file.
			# The log levels are defined per stream according to the CLI args or the configuration.
			opt.streams = [
				{
					level: args['io-level']
					stream: process.stdout
				},
				{
					level: args['file-level']
					path: @logPath
				}
			]
			# Finally we create the bunyan logger and return it
			bunyan.createLogger opt

		# If something goes wrong we print the error and return an empty logger.
		catch e
			console.error e
			emptylog

