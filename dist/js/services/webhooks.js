'use strict';

// Serve Webhooks
// ==============
// > Answers webhook requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	crypto = require('crypto-js'),

	activeHooks = {},
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

geb.addListener('system:init', (msg) => {
	db.getAllWebhooks()
		.then((arrHooks) => {
			log.info('SRVC:WH | Initializing '+arrHooks.length+' Webhooks');
			for (let i = 0; i < arrHooks.length; i++) {
				let h = arrHooks[i];
				activeHooks[h.hookid] = h;
				geb.emit('webhook:activated', h.hookid);
			}
		})
		.catch((err) => log.error(err));
});

// User fetches all his existing webhooks
router.post('/get', (req, res) => {
	log.info('SRVC:WH | Fetching all Webhooks');
	db.getAllUserWebhooks(req.session.pub.id)
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

function genHookID(arrExisting) {
	var hash = crypto.MD5(Math.random()+(new Date)).toString(crypto.enc.Hex);
	if(arrExisting.indexOf(hash) > -1) hash = genHookID(arrExisting);
	return hash;
}

// User wants to create a new webhook

// Beautiful example for why promises should be used!
router.post('/create', (req, res) => {
	let userId = req.session.pub.id;
	let rb = req.body;
	db.getAllUserWebhooks(userId)
		.then((oHooks) => {
			let arrHookNames = oHooks.private.map((o) => o.hookname);
			if(arrHookNames.indexOf(rb.hookname) > -1) {
				db.throwStatusCode(409, 'Webhook already existing: '+rb.hookname);
			}
		})
		.then(() => db.getAllWebhooks())
		.then((arrAllHooks) => genHookID(arrAllHooks.map((o) => o.hookid)))
		.then((hid) => db.createWebhook(userId, hid, rb.hookname, rb.isPublic))
		.then((oHook) => {
			log.info('SRVC:WH | Webhook "'+oHook.hookname
				+'" created with ID "'+oHook.id+'" and activated');
			activeHooks[oHook.hookid] = oHook;
			geb.emit('webhook:activated', oHook.hookid);
			res.send(oHook);
		})
		.catch(db.errHandler(res));
})

// User wants to delete a webhook
router.post('/delete/:id', (req, res) => {
	let hookid = req.params.id;
	log.info('SRVC:WH | Deleting Webhook '+hookid);
	db.deleteWebhook(req.session.pub.id, hookid)
		.then(() => {
			delete activeHooks[hookid];
			geb.emit('webhook:deactivated', hookid);
			res.send('OK!');
		})
		.catch(db.errHandler(res));
})

// A remote service pushes an event over a webhook to our system
router.post('/event/:id', (req, res) => {
	let oHook = activeHooks[req.params.id];
	if(oHook) {
		let now = new Date();
		req.body.engineReceivedTime = now.getTime();
		req.body.origin = req.ip;
		let obj = {
			hookid: oHook.id,
			hookname: oHook.hookname,
			body: req.body
		};
		geb.emit('webhook:event', obj);
		res.send('Thank you for the event on: "'+oHook.hookname+'" at ' + now);
	} else res.status(404).send('Webhook not existing!');
});
