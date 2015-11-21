'use strict';

// Serve Rules
// ===========
// > Answers rule requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	geb = global.eventBackbone,
	db = global.db;

var router = module.exports = express.Router();

router.post('/get', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rules');
	db.getAllRules(req.session.pub.id)
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/store', (req, res) => {
	log.info('SRVC | RULES | Storing new Rule');
	let oRule = {
		name: req.body.name,
		conditions: req.body.conditions,
		actions: req.body.actions
	}
	db.storeRule(req.session.pub.id, oRule, req.body.hookid)
		.then((oRule) => {
			geb.emit('rule:new', oRule);
			res.send('Rule stored!');
		})
		.catch(db.errHandler(res))
});

router.post('/delete', (req, res) => {
	log.info('SRVC | RULES | Deleting Rule #' +req.body.id);
	db.deleteRule(req.session.pub.id, req.body.id)
		.then(() => res.send('Rule deleted!'))
		.catch(db.errHandler(res))
});

