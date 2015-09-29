
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging');

var Sequelize = require('sequelize');

// Internal variables :
var sequelize, User;

exports.init = (oDB) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('POSTGRES | Connecting module: ' + oDB.module + ', port: ' + dbPort + ', database: ' + oDB.db);
	sequelize = new Sequelize('postgres://postgres:postgres@localhost:' + dbPort + '/' + oDB.db, {
		logging: false,
		define: { timestamps: false }
	});
	initializeModels();
}

function initializeModels() {
	// See http://docs.sequelizejs.com/en/latest/docs/models-definition/ for a list of available data types
	User = sequelize.define('User', {
		username: Sequelize.STRING,
		password: Sequelize.STRING,
		isAdmin: Sequelize.BOOLEAN
	});

	sequelize.sync().then(() => {
		log.info('POSTGRES | Synced Models');
	});
}

exports.isConnected = (cb) => sequelize.authenticate().then(cb);

// USERS
exports.getUserIds = (cb) => {
	console.log('Getting users');
	cb();
}
