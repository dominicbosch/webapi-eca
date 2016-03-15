'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase'),

	fb, hostid;

exports.init = (conf) => {
	return new Promise((resolve, reject) => {
		fb = new Firebase(conf.firebase.app);
		log.info('FB | Connecting to Firebase...');
		fb.authWithCustomToken(conf.firebase.token, function(error, oToken) {
			if (error) {
				reject("FB | Error connecting to Firebase: ", 
					error.toString(),
					"You might want to change your configuration in config/system.json"
				);
			} else {
				log.info("FB | Successfully connected to firebase");
				hostid = conf.name;

				fb.onAuth((authData) => {
					if(!authData) log.warn('FB | Authorization lost!');
				});
				resolve();
			}
		})
	});
}

exports.getHostId = () => hostid;

exports.getLastIndex = (uid, cb) => {
	fb.child(hostid+'/users/'+uid+'/index').once('value', (v) => cb(null, v.val() || 0));
}

exports.logState = (uid, state, ts) => {
	fb.child(hostid+'/users/'+uid+'/'+state).push(ts);
}
exports.logDBSize = (size) => {
	fb.child(hostid+'/dbsize').push({
		timestamp: (new Date()).getTime(),
		size: size
	});
}


exports.logStats = (uid, oData) => {
	fb.child(hostid+'/users/'+uid+'/index').set(oData.index);
	fb.child(hostid+'/users/'+uid+'/data/'+oData.index).set(oData);
	fb.child(hostid+'/users/'+uid+'/latest').set(oData);
}
