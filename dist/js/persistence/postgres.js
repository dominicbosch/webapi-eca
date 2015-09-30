
// # PostgreSQL DB Connection Module

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging');

var Sequelize = require('sequelize');

// Internal variables :
var sequelize, Users;

// ## DB Connection

// Initializes the DB connection. This returns a promise. Which means you can attach .then or .catch handlers 
exports.init = (oDB) => {
	var dbPort = parseInt(oDB.port) || 5432;
	log.info('POSTGRES | Connecting module: ' + oDB.module + ', port: ' + dbPort + ', database: ' + oDB.db);
	sequelize = new Sequelize('postgres://postgres:postgres@localhost:' + dbPort + '/' + oDB.db, {
		// logging: false,
		define: { timestamps: false }
	});
	return sequelize.authenticate().then(initializeModels);
};

function initializeModels() {
	// See http://docs.sequelizejs.com/en/latest/docs/models-definition/ for a list of available data types
	Users = sequelize.define('User', {
		username: Sequelize.STRING,
		password: Sequelize.STRING,
		isAdmin: Sequelize.BOOLEAN
	});

	sequelize.sync().then(() => log.info('POSTGRES | Synced Models'));
	// sequelize.sync({ force: true }).then(() => log.info('POSTGRES | Synced Models'));
}

exports.checkConnection = (cbYes, cbNo) => sequelize.authenticate().then(cbYes, cbNo)

// shutDown closes the DB connection
exports.shutDown = (cb) => {
	log.warn('POSTGRES | Closing connection!');
	sequelize.close();
	sequelize = null;
};


// ## USERS

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUserIds = (cb) => {
	Users.findAll().then((arrRecords) => {
		cb(null, arrRecords.map((oRecord) => {
			return oRecord.dataValues.username;
		}))
	});
};

// Fetch all user IDs and pass them to cb(err, obj).
exports.storeUser = (oUser) => {
	log.info('POSTGRES | Storing new user ' + oUser.username);
	Users.create(oUser).then((user) =>
		{console.log(user.get({ plain: true}));}
	);
};
