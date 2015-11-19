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

geb.addListener('system:init', (msg) => {
	db.getAllWebhooks((err, oHooks) => {
		if(oHooks) {
			log.info('SRVC | WEBHOOKS | Initializing '+Object.keys(oHooks).length+' Webhooks');
			allowedHooks = oHooks;
		}
	});
});

// User fetches all his existing webhooks
router.post('/get', (req, res) => {
	log.info('SRVC | WEBHOOKS | Fetching all Webhooks');
	db.getAllUserWebhooks(req.session.pub.id, (err, arr) => {
		if(err) {
			log.error(err);
			res.status(500).send('Fetching all webhooks failed');
		} else res.send(arr);
	});
});

function genHookID(arrExisting) {
	var hash = crypto.MD5(Math.random()+(new Date)).toString(crypto.enc.Hex);
	if(arrExisting.indexOf(hash) > -1) hash = genHookID(arrExisting);
	return hash;
}

// User wants to create a new webhook

// Beautiful example for why promises should be used!
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
				db.getAllWebhooks((err, arrAllHooks) => {
					if(err) res.status(500).send('Unable to fetch all Webhooks');
					else {
						let hookid = genHookID(arrAllHooks.map((o) => o.hookid));
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
				})
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
		} else res.status(400).send(err.toString());
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
