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

	allowedHooks = {},
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

var errHandler = (res) => (err) => {
	log.error(err);
	res.status(err.statusCode || 500);
	res.send(err.message);
}

geb.addListener('system:init', (msg) => {
	db.getAllWebhooks().then((arrHooks) => {
		log.info('SRVC | WEBHOOKS | Initializing '+arrHooks.length+' Webhooks');
		for (let i = 0; i < arrHooks.length; i++) {
			let h = arrHooks[i];
			allowedHooks[h.hookid] = h; 
		}
		console.log(allowedHooks)
	}).catch((err) => log.error(err));
});

// User fetches all his existing webhooks
router.post('/get', (req, res) => {
	log.info('SRVC | WEBHOOKS | Fetching all Webhooks');
	db.getAllUserWebhooks(req.session.pub.id)
		.then((arr) => res.send(arr))
		.catch(errHandler(res));
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
	db.getAllUserWebhooks(userId)
		.then((oHooks) => {
			let arrHookNames = oHooks.private.map((o) => o.hookname);
			if(arrHookNames.indexOf(req.body.hookname) > -1) {
				let e = new Error('Webhook already existing: '+req.body.hookname);
				e.statusCode = 409;
				throw e;
			}
		})
		.then(() => db.getAllWebhooks())
		.then((arrAllHooks) => genHookID(arrAllHooks.map((o) => o.hookid)))
		.then((newHookId) => {
			let isPublic = (req.body.isPublic==='true');
			return db.createWebhook(userId, newHookId, req.body.hookname, isPublic)
				.then(() => newHookId);
		})
		.then((hookid) => {
			log.info('SRVC | WEBHOOKS "'+hookid+'" created and activated');
			allowedHooks[hookid] = {
				hookname: req.body.hookname,
				userid: userId
			}
			res.send('Webhook created!');
		})
		.catch(errHandler(res));
})

// User wants to delete a webhook
router.post('/delete/:id', (req, res) => {
	let hookid = req.params.id;
	log.info('SRVC | WEBHOOKS | Deleting Webhook '+hookid);
	db.deleteWebhook(req.session.pub.id, hookid, (err, msg) => {
		if(!err) {
			delete allowedHooks[hookid];
			res.send('OK!');
		} else res.status(400).send(err.toString());
	})
})

// A remote service pushes an event over a webhook to our system
router.post('/event/:id', (req, res) => {
	let oHook = allowedHooks[req.params.id];
	if(oHook) {
		req.body.engineReceivedTime = (new Date()).getTime();
		let obj = {
			eventname: oHook.hookname,
			body: req.body
		};
		geb.emit('event:'+req.params.id, obj)
		res.send('Thank you for the event on: "'+oHook.hookname+'"');
	} else res.status(404).send('Webhook not existing!');
});
