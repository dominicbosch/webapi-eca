
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging');

var Sequelize = require('sequelize');

// Internal variables :
var sequelize, Users;

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

	sequelize.sync({ force: true }).then(() => log.info('POSTGRES | Synced Models'));
}

exports.checkConnection = (cbYes, cbNo) => {

	sequelize.authenticate().then(cbYes, cbNo)
	// .catch((err) => {
	// 	console.log ('isFed')
	// 	console.log (err)
	// });
}

// shutDown closes the DB connection
exports.shutDown = (cb) => {
	log.warn('POSTGRES | Closing connection!');
	sequelize.close();
	sequelize = null;
}

// USERS

// Fetch all user IDs and pass them to cb(err, obj).
exports.getUserIds = (cb) => {
	console.log('Getting users');
	Users.findAll().then((arrUsers) => cb(null, arrUsers));
}

// Fetch all user IDs and pass them to cb(err, obj).
exports.storeUser = (oUser) => {
	console.log('Storing user', oUser);
	Users.create(oUser).then((user) =>
		{console.log(user.get({ plain: true}));}
	);
}
