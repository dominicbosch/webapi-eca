path = require 'path'
logger = require path.join '..', '..', 'js-coffee', 'logging'
log = logger.getLogger
  nolog: true
db = require path.join '..', '..', 'js-coffee', 'persistence'
opts =
  logger: log
opts[ 'db-port' ] = 6379
db opts

# This needs to be done because else the DB connection will remain alive and
# prevent the unit test from ending
setTimeout db.shutDown, 2000