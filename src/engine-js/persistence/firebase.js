'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase'),

	oUserIndex = {},
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

exports.logStats = (uid, oData) => {
	let i = oUserIndex[uid] || 0;
	i = (i < 10000) ? i : 0;
	fb.child(hostid+'/'+uid+'/'+i).set(oData);
	oUserIndex[uid] = ++i;
	
	// fb.child(hostid+'/'+uid+'/timestamp/'+last).once('value', (data) => {
	// 	let oFirst = data.val();
	// 	if(!oFirst) oFirst = oData.timestamp;
	// 	fb.child(hostid+'/'+uid+'/start').set(oFirst);
	// 	fb.child(hostid+'/'+uid+'/end').set(oData.timestamp);
	// 	fb.child(hostid+'/'+uid+'/timestamp/'+i).set(oData.timestamp);
	// 	fb.child(hostid+'/'+uid+'/heapTotal/'+i).set(oData.memory.heapTotal);
	// 	fb.child(hostid+'/'+uid+'/heapUsed/'+i).set(oData.memory.heapUsed);
	// 	fb.child(hostid+'/'+uid+'/rss/'+i).set(oData.memory.rss);
	// 	fb.child(hostid+'/'+uid+'/loadavg/'+i).set(oData.loadavg[0]);
	// 	oUserIndex[uid] = ++i;
	// });
}
		// timestamp: (new Date()).getTime(),
		// memory: process.memoryUsage(),
		// loadavg: os.loadavg()