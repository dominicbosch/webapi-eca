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
	db.getAllActionDispatchers(req.session.pub.id, (err, arr) => {
		if(err) res.status(500).send(err.toString());
		else res.send(arr);
	});
});

router.post('/get/:id', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Fetching one by id: ' + req.params.id);
	db.getActionDispatcher(req.session.pub.id, req.params.id, (err, oADs) => {
		if(err) res.status(500).send(err.toString());
		else res.send(oADs);
	});
});

router.post('/create', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | Create: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body
	};
	storeModule(args, res);
});

router.post('/update', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | UPDATE: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body,
		id: req.body.id
	};
	storeModule(args, res);
});

function storeModule(args, res) {
	db.getAllActionDispatchers(args.userid, (err, arr) => {
		arr = arr || [];
		if(args.id) arr = arr.filter((o) => o.id !== parseInt(args.id));
		let arrNames = arr.map((o) => o.name);
		if(arrNames.indexOf(args.body.name) > -1) {
			res.status(409).send('Module name already existing: '+args.body.name);
		} else {

			let options = { globals: args.body.globals };
			log.info('SRVC:AD | Running AD ', args.body.name);
			dynmod.runStringAsModule(args.body.code, args.body.lang, args.username, options, (err, oMod) => {
				if(err) {
					log.error('SRVC:AD | Error running string as module: ', err);
					res.status(err.code).send(err.message);
				} else {
					function fAnsw(err) {
						if(err) {
							log.warn('SRVC:AD | Unable to store Action Dispatcher', err);
							res.status(err.code).send('Action Dispatcher not stored! ' + err.message)
						} else {
							log.info('SRVC:AD | Module stored');
							res.send('Action Dispatcher stored!')
						}
					}
					
					log.info('CM | Storing module "'+args.body.name+'" with functions '+Object.keys(oMod.functions).join(', '));
					let oModule = args.body;
					delete oModule.id; // If the ID is set it is an update of an existing module
					oModule.comment = oMod.comment;
					oModule.functions = oMod.functions;
					if(args.id) db.updateActionDispatcher(args.userid, args.id, oModule, fAnsw);
					else db.createActionDispatcher(args.userid, oModule, fAnsw);
				}
			});
		}
	});
}

router.post('/delete', (req, res) => {
	log.info('SRVC | ACTION DISPATCHERS | DELETE: #' + req.body.id);
	db.deleteActionDispatcher(req.session.pub.id, req.body.id, (err, msg) => {
		if(err) {
			log.error(err);
			res.status(400).send('Unable to delete Module #' + req.body.id);
		} else {
			res.send(msg);
		}
	});
});
