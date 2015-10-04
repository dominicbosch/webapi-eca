'use strict';

// Serve Webhooks
// ==============
// > Answers webhook requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),

	allowedHooks = {},
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

geb.addListener('system', (msg) => {
	if(msg === 'init') {
		db.getAllWebhooks((err, oHooks) => {
			if(oHooks) {
				log.info('SRVC | WEBHOOKS | Initializing '+Object.keys(oHooks).length+' Webhooks');
				allowedHooks = oHooks;
			}
		});
	}
});

// User fetches all his existing webhooks
router.post('/getall', (req, res) => {
	log.info('SRVC | WEBHOOKS | Fetching all Webhooks');
	db.getAllUserWebhooks(req.session.pub.id, (err, arr) => {
		if(err) {
			log.error(err);
			res.status(500).send('Fetching all webhooks failed');
		} else res.send(arr);
	});
});

function genHookID(arrExisting) {
	var hid = '';
	for(let i = 0; i < 2; i++) {
		hid += Math.random().toString(36).substring(2);
	}
	if(arrExisting.indexOf(hid) > -1) hid = genHookID(arrExisting);
	return hid;
}

// User wants to create a new webhook
router.post('/create', (req, res) => {
	if (!req.body.hookname) res.status(400).send('Please provide a hook name');
	else {
		let userId = req.session.pub.id;
		db.getAllUserWebhooks(userId, (err, oHooks) => {
			let hookExists = false;
			for(let hookid in oHooks.private) {
				if(oHooks.private[hookid].hookname === req.body.hookname) hookExists = true;
			}
			if(hookExists) res.status(409).send('Webhook already existing: '+req.body.hookname);
			else {
				let hookid = genHookID(Object.keys(oHooks || {}));
				db.createWebhook(userId, hookid, req.body.hookname, (req.body.isPublic==='true'), (err) => {
					if(err) {
						log.error(err);
						res.status(500).send('Unable to create Webhook!');
					} else {
						log.info('SRVC | WEBHOOKS "'+hookid+'" created and activated');
						allowedHooks[hookid] = {
							hookname: req.body.hookname,
							userid: userId
						}
						res.status(200).send({
							hookid: hookid,
							hookname: req.body.hookname
						});
					}
				});
			}
		});
	}
})

// User wants to delete a webhook
router.post('/delete/:id', (req, res) => {
	let hookid = req.params.id;
	log.info('SRVC | WEBHOOKS | Deleting Webhook '+hookid);
	db.deleteWebhook(req.session.pub.id, hookid, (err, msg) => {
		if(!err) {
			delete allowedHooks[hookid];
			res.send('OK!');
		} else res.status(400).send(err);
	})
})

// // A remote service pushes an event over a webhook to our system
// // http://localhost:8080/service/webhooks/event/v0lruppnxsdwt5h8ybny7gb9rh9smz6cwfudwqptnxbf0f6r
// router.post('/event/:id', (req, res) => {
// 	let oHook = allowedHooks[req.params.id];
// 	if(oHook) {
// 		req.body.engineReceivedTime = (new Date()).getTime();
// 		let obj = {
// 			eventname: oHook.hookname,
// 			body: req.body
// 		};
// 		db.pushEvent(obj);
// 		resp.send({
// 			message: 'Thank you for the event: "'+oHook.hookname+'"',
// 			evt: obj
// 		});
// 	} else res.status(404).send('Webhook not existing!');
// });
