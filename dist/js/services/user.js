'use strict';

// User Service
// =============
// > Manage the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	pm = require('../process-manager'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),

	arrLastStart = {},
	db = global.db,
	geb = global.eventBackbone,
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

router.post('/worker/state/start', (req, res) => {
	let uname = req.body.username;
	let now = (new Date()).getTime();
	if(arrLastStart[uname] && arrLastStart[uname] > (now - 60*1000)) {
		res.status(400).send('You can\'t start your worker all the time. Please wait at least one minute!');
	} else {
		db.getUserByName(req.body.username, (err, oUser) => {
			if(oUser) {
				pm.startWorker(oUser, (err) => {
					if(err) res.status(400).send(err);
					else {
						res.send('Done');
						arrLastStart[uname] = now;
					}					
				});
			} else res.status(404).send('User not found!')
		});
	}
});

router.post('/worker/state/kill', (req, res) => {
	db.getUserByName(req.body.username, (err, oUser) => {
		if(oUser) {
			pm.killWorker(oUser, (err) => {
				if(err) res.status(400).send(err);
				else res.send('Done');
			});
		} else res.status(404).send('User not found!')
	});
});


router.post('/worker/get', (req, res) => {
	db.getWorker(req.body.username, (err, oWorker) => {
		if(err) res.status(404).send('Not found!')
		else res.send(oWorker);
	});
});