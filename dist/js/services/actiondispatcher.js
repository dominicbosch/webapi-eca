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

router.post('/get', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Fetching all');
	db.getAllActionDispatchers(req.session.pub.id, (err, oADs) => {
		if(err) res.status(500).send(err);
		else res.send(oADs);
	});
});

// router.post('/get/:id', (req, res) => {
// 	log.info('SRVC | ACTION DISPATCHERS | Fetching one by id: ' + req.params.id);
// 	db.getActionDispatcher(req.session.pub.id, req.params.id, (err, oADs) => {
// 		if(err) res.status(500).send(err);
// 		else res.send(oADs);
// 	});
// });

router.post('/create', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Create: ' + req.body.name);
	db.getAllActionDispatchers(req.session.pub.id, (arr) => {
		arr = arr || [];
		let arrNames = arr.map((o) => o.name);
		if(arrNames.indexOf(req.body.name) > -1) {
			req.status(409).send('Module name already existing: '+req.body.name);
		} else {
			let args = {
				username: req.session.pub.username,
				body: req.body
			};
			storeModule(args, res);
		}
	});
});

router.post('/update', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | UPDATE: ' + req.body.name);
	db.getActionDispatcher(req.session.pub.id, req.body.id, (arr) => {
		log.info('found single AD: ', arr);
		arr = arr || [];
		let arrNames = arr.map((o) => o.name);
		if(arrNames.indexOf(req.body.name) > -1) {
			let args = {
				userid: req.session.pub.userid,
				username: req.session.pub.username,
				body: req.body,
				id: req.body.id
			};
			storeModule(args, res);
		} else {
			req.status(409).send('Module not existing: '+req.body.name);
		}
	});
});

function storeModule(args, res) {
	let options = { globals: args.body.globals };
	log.info('SRVC:AD | Running AD ', args.body.name);
	dynmod.runStringAsModule(args.body.code, args.body.lang, args.username, options, (err, oMod) => {
		if(err) {
			log.error('SRVC:AD | Error running string as module: ', err);
			res.status(err.code).send(err.message);
		} else {
			log.info('CM | Storing module "'+oMod.name+'" with functions '+Object.keys(oMod.functions).join(', '));
			function fAnsw(err) {
				if(err) {
					log.warn('SRVC:AD | Unable to store Action Dispatcher', err);
					res.status(500).send('Action Dispatcher not stored!')
				} else {
					log.info('SRVC:AD | Module stored');
					res.send('Action Dispatcher stored!')
				}
			};
			if(args.id) db.updateActionDispatcher(args.userid, args.id, oMod, fAnsw);
			else db.createActionDispatcher(args.userid, oMod, fAnsw);
		}
	});
}
