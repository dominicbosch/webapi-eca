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
	db.getUser(req.session.pub.id, (err, oUser) => {
		if(req.body.oldpassword === oUser.password) {
			db.updateUserAttribute(req.session.pub.id, 'password', req.body.newpassword, (err) => {
				if(err) {
					log.error('Unable to change user password!', err);
					res.status(401).send('Password changing failed!');
				} else {
					log.info('SRVC | USER | Password changed for: '+oUser.username+' (#'+oUser.id+')');
					res.send('Password changed!');
				}
			});
		} else res.status(409).send('Wrong password!');
	});
});

router.post('/forcepasswordchange', (req, res) => {
	if(!req.session.pub.isAdmin) {
		res.status(401).send('You are not allowed to do this!');
	} else {
		db.updateUserAttribute(req.body.userid, 'password', req.body.newpassword, (err) => {
			if(err) {
				log.error('Unable to change user password!', err);
				res.status(401).send('Password changing failed!');
			} else {
				log.info('SRVC | USER | Password changed for (#'+req.body.userid+')');
				res.send('Password changed!');
			}
		});
	}
});

router.post('/getall', (req, res) => {
	db.getAllUsers((err, arrUsers) => {
		if(err) res.status(500).send('Unable to fetch users!');
		else res.send(arrUsers);
	});
});