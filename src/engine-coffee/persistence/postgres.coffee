
# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'

Sequelize = require 'sequelize'

exports.init = (dbPort) =>
	log.info 'DB | INIT DB'
	@port = dbPort || 5432

exports.selectDatabase = (db) =>
	log.info 'DB | SELECT DB: ' + db
	@sequelize = new Sequelize 'postgres://postgres:postgres@localhost:' + @port + '/' + db, define: timestamps: false

exports.isConnected = (cb) =>
	@sequelize.authenticate().then cb