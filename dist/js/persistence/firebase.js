'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase'),

	fb, hostid;

exports.init = (conf) => {
	fb = new Firebase(conf.app);
	log.info('FB | Connecting to Firebase...');
	fb.authWithCustomToken(conf.token, function(error, oToken) {
		if (error) {
			log.error("FB | Error creating user:", error);
		} else {
			log.info("FB | Successfully connected to firebase with token id:", oToken.uid);
			hostid = oToken.uid;
			fb.child(hostid).set(null);
		}
	});
}

// As easy as that :)
exports.logStats = (uid, oData) => fb.child(hostid+'/'+uid).push(oData);