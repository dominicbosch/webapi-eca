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

geb.addListener('modules:init', () => {
	db.getAllRules()
		.then((arr) => {
			for(var i = 0; i < arr.length; i++) {
				geb.emit('rule:new', arr[i]);
			}
		})
		.catch((err) => log.error(err));
});

router.post('/get', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rules');
	db.getAllRulesSimple(req.session.pub.id)
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/getlog/:id', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rule logs');
	db.getRuleLog(req.session.pub.id, req.params.id)
		.then((log) => res.send(log))
		.catch(db.errHandler(res));
});

router.post('/clearlog/:id', (req, res) => {
	log.info('SRVC | RULES | Clearing Rule log #'+req.params.id);
	db.clearRuleLog(req.session.pub.id, req.params.id)
		.then(() => res.send('Thanks!'))
		.catch(db.errHandler(res));
});

router.get('/getdatalog/:id', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rule data logs');
	db.getRuleDataLog(req.session.pub.id, req.params.id)
		.then((log) => {
			res.set('Content-Type', 'text/json')
				.set('Content-Disposition', 'attachment; filename=rule_'+req.params.id+'_data.json')
				.send(log)
		})
		.catch(db.errHandler(res));
});

router.post('/cleardatalog/:id', (req, res) => {
	log.info('SRVC | RULES | Clearing Rule data log #'+req.params.id);
	db.clearRuleDataLog(req.session.pub.id, req.params.id)
		.then(() => db.logRule(req.params.id, 'Data Log deleted!'))
		.then(() => res.send('Thanks!'))
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

