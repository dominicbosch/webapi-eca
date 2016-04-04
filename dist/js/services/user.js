'use strict';

// User Service
// =============
// > Manage the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),

	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

router.post('/passwordchange', (req, res) => {
	let uid = req.session.pub.id;
	let pUser = db.getUser(uid);

	pUser.then((oUser) => {
			if(req.body.oldpassword !== oUser.password) {
				db.throwStatusCode(409, 'Wrong Password!');
			}
		})
		.then(() => db.updateUserAttribute(uid, 'password', req.body.newpassword))
		.then(() => {
			let oUser = pUser.value(); // Get the value of the previously executed promise
			log.info('SRVC:USER | Password changed for: '+oUser.username+' (#'+oUser.id+')');
			res.send('Password changed!');
		})
		.catch(db.errHandler(res));
});

router.post('/forcepasswordchange', (req, res) => {
	let rb = req.body;
	if(!req.session.pub.isAdmin) {
		res.status(401).send('You are not allowed to do this!');
	} else {
		db.updateUserAttribute(rb.userid, 'password', rb.newpassword)
			.then(() => {
				log.info('SRVC:USER | Password changed for (#'+rb.userid+')');
				res.send('Password changed!');
			})
			.catch(db.errHandler(res));
	}
});

router.post('/getall', (req, res) => {
	db.getAllUsers()
		.then((arrUsers) => res.send(arrUsers))
		.catch(db.errHandler(res));
});
