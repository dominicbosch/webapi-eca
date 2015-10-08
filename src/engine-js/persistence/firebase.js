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
			fb.child(hostid).set(null);
			geb.emit('firebase:init');
		}
	});
}


exports.logStats = (uid, oData) => {
	let i = oUsers[uid] || 0;
	i = (i < 1000) ? i : 0;
	fb.child(hostid+'/'+uid+'/index').set(i);
	fb.child(hostid+'/'+uid+'/data/'+i).set(oData);
	fb.child(hostid+'/'+uid+'/latest').set(oData);
	oUsers[uid] = i+1;
}
