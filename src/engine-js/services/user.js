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
	router = module.exports = express.Router();

router.post('/passwordchange', (req, res) => {
	db.getUser(req.session.pub.username, (err, oUser) => {
		if(req.body.oldpassword === oUser.password) {
			oUser.password = req.body.newpassword;
			if(db.storeUser(oUser)) {
				log.info('SRVC | USER | Password changed for: '+oUser.username);
				res.send('Password changed!');
			} else res.status(401).send('Password changing failed!');
		} else res.status(409).send('Wrong password!');
	});
});

router.post('/forcepasswordchange', (req, res) => {
	if(req.session.pub.admin !== 'true') {
		res.status(401).send('You are not allowed to do this!');
	} else {
		db.getUser(req.body.username, (err, oUser) => {
			oUser.password = req.body.newpassword;
			if(db.storeUser(oUser)) {
				log.info('SRVC | USER | Password changed for: '+oUser.username);
				res.send('Password changed!');
			} else res.status(401).send('Password changing failed!');
		})
	}
});

router.post('/getall', (req, res) => {
	db.getAllUsers((err, arrUsers) => {
		if(err) res.status(500).send('Unable to fetch users!');
		else res.send(arrUsers);
	});
});