'use strict';

// Serve ACTION DISPATCHERS
// ========================

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - [Dynamic Modules](dynamic-modules.html)
	dynmod = require('../dynamic-modules'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db,
	router = module.exports = express.Router();

router.post('/getall', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Fetching all');
	db.getAllActionDispatchers(req.session.pub.id, (err, oADs) => {
		if(err) res.status(500).send(err);
		else res.send(oADs);
	});
});

router.post('/store', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Storing');
	db.getAllActionDispatchers(req.session.pub.id, (arr) => {
		arr = arr || [];
		let arrNames = arr.map((o) => o.name);
		console.log('new module', req.body.id);
		console.log('all actions: ', arrNames);
		if(arrNames.indexOf(req.body.name) > -1) {
			if(req.overwrite) storeModule(req.session.pub, req.body, res);
			else req.status(409).send('Module name already existing: '+req.body.name);
		} else {
			if(req.overwrite) req.status(404).send('Module not found! Unable to overwrite '+req.body.name);
			else storeModule(req.session.pub, req.body, res);
		}
	});
});

function storeModule(oUser, oBody, res) {	
	let oModule = {
		src: oBody.data,			// code
		lang: oBody.lang,			// script language
		globVars: oBody.globVars	// global variables required from the user to run this module
		// userId: oUser.id,			// userId
	};
	log.info('SRVC:AD | Running AD', Object.keys(oBody));
	let mId = 'TMP|AD|'+Math.random().toString(36).substring(2)+'.vm';
	// moduleId, src, lang, oGlobalVars, logFunction, oUser, cb
	console.log(mId, oBody, oUser);
	dynmod.runStringAsModule(mId, oBody.data, oBody.lang, {}, () => {}, oUser, (err, oRunning) => {
		if(err) {
			log.error('SRVC:AD | Error running string as module: '+err.message);
			res.status(err.code).send(err.message);
		} else {
			log.info('CM | Storing new module with functions '+Object.keys(oRunning.functionArgs).join(', '));
			db.createActionDispatcher(oUser.username, oBody, (err) => {
				if(err) {
					log.warn('SRVC:AD | Unable to store Action Dispatcher', err);
					res.status(500).send('Action Dispatcher not stored!')
				} else {
					log.info('SRVC:AD | Module stored');
					res.send('Action Dispatcher stored!')
				}
				// answ.message = ' Module '+oBody.id+' successfully stored! Found following function(s): '+funcs;
			});
		}
	});
}
