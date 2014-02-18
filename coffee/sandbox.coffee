bunyan = require 'bunyan'
opt =
	name: "webapi-eca"
opt.streams = [
	{
	  level: 'info'
	  stream: process.stdout
	},
	{
	  level: 'info'
	  path: 'logs/server.log'
	}
	]
# Finally we create the bunyan logger
logger = bunyan.createLogger opt
logger.info 'weeee'