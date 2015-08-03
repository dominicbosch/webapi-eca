
###

Serve Rules
===========
> Answers rule requests from the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

router.post '/getall', ( req, res ) ->
	log.info 'SRVC | RULES | Fetching all Rules'
	db.getAllRules req.session.pub.username, ( err, arr ) ->
		console.log 'DB returned arr', arr
		if err
			res.status( 500 ).send 'Fetching all rules failed'
		else
			res.send arr


# FIXME USE WHEN GC FORCED, NEW RULE CREATED A D RULE
    # global.gc();
    # console.log('Memory Usage:');
    # console.log(util.inspect(process.memoryUsage()));