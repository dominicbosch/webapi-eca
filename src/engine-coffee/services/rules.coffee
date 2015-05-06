
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

exports = module.exports = express.Router()


# FIXME USE WHEN GC FORCED, NEW RULE CREATED A D RULE
    # global.gc();
    # console.log('Memory Usage:');
    # console.log(util.inspect(process.memoryUsage()));