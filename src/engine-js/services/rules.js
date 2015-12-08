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

router.post('/get/:id', (req, res) => {
	log.info('SRVC | RULES | Fetching Rule #'+req.params.id);
	db.getRule(req.session.pub.id, req.params.id)
		.then((o) => res.send(o))
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

function storeRule(uid, reason, body, res) {
	let oRule = {
		name: body.name,
		conditions: body.conditions,
		actions: body.actions
	};
	let prom;
	if(reason === 'create') prom = db.createRule(uid, oRule, body.hookurl)
	else prom = db.updateRule(uid, body.id, oRule, body.hookurl)
	prom.then((oRule) => {
			geb.emit('rule:new', oRule);
			res.send({ id: oRule.id });
		})
		.catch(db.errHandler(res))
}

router.post('/create', (req, res) => {
	log.info('SRVC | RULES | Creating new Rule');
	storeRule(req.session.pub.id, 'create', req.body, res);
});

router.post('/update', (req, res) => {
	log.info('SRVC | RULES | Updating existing Rule #'+req.body.id);
	storeRule(req.session.pub.id, 'update', req.body, res);
});

router.post('/delete', (req, res) => {
	log.info('SRVC | RULES | Deleting Rule #' +req.body.id);
	db.deleteRule(req.session.pub.id, req.body.id)
		.then(() => {
			geb.emit('rule:delete', req.body.id);
			res.send('Rule deleted!')
		})
		.catch(db.errHandler(res))
});

