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
	let uid = req.session.pub.id;
	db.getUser(uid)
		.then((oUser) => {
			if(req.body.oldpassword !== oUser.password) {
				db.throwStatusCode(409, 'Wrong Password!');
			}
			return oUser;
		})
		.then(() => db.updateUserAttribute(uid, 'password', req.body.newpassword))
		.then(() => {
			log.info('SRVC | USER | Password changed for: '+oUser.username+' (#'+oUser.id+')');
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
				log.info('SRVC | USER | Password changed for (#'+rb.userid+')');
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

router.post('/worker/state/start', (req, res) => {
	let uname = req.body.username;
	let now = (new Date()).getTime();
	if(arrLastStart[uname] && arrLastStart[uname] > (now - 60*1000)) {
		res.status(400).send('You can\'t start your worker all the time. Please wait at least one minute!');
	} else {
		db.getUserByName(req.body.username)
			.then((oUser) => pm.startWorker(oUser))
			.then(() => {
				res.send('Done');
				arrLastStart[uname] = now;
			})
			.catch(db.errHandler(res));
	}
});

router.post('/worker/state/kill', (req, res) => {
	db.getUserByName(req.body.username)
		.then((oUser) => pm.killWorker(oUser.id, oUser.username))
		.then(() => res.send('Done'))
		.catch(db.errHandler(res));
});


router.post('/worker/get', (req, res) => {
	db.getWorker(req.body.username)
		.then((oWorker) => res.send(oWorker))
		.catch(db.errHandler(res));
});

router.post('/worker/memsize', (req, res) => { res.send(''+pm.getMaxMem()) });