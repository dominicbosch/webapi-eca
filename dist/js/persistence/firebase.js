'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase');

exports.init = (conf) => {
	let fb = new Firebase(conf.app);
	log.info('FB | Connecting to Firebase...');
	fb.authWithCustomToken(conf.token, function(error, userData) {
		if (error) {
			log.error("FB | Error creating user:", error);
		} else {
			log.info("FB | Successfully created user account with uid:", userData.uid);
		}
	});
}