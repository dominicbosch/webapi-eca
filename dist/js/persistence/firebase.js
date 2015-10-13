'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase'),

	geb = global.eventBackbone,

	oUsers = {},
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
			// fb.child(hostid).set(null);
			geb.emit('firebase:init');
		}
	});
}


exports.getLastIndex = (uid, cb) => {
	fb.child(hostid+'/'+uid+'/index').once('value', (v) => cb(null, v.val() || 0));
}

exports.logState = (uid, state, ts) => {
	fb.child(hostid+'/'+uid+'/'+state).push(ts);
}


exports.logStats = (uid, oData) => {
	fb.child(hostid+'/'+uid+'/index').set(oData.index);
	fb.child(hostid+'/'+uid+'/data/'+oData.index).set(oData);
	fb.child(hostid+'/'+uid+'/latest').set(oData);
}
