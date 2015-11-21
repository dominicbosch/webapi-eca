'use strict';

// Administration Service
// ======================
// > Handles admin requests, such as create new user

// **Loads Modules:**

// - External Modules: [express](http://expressjs.com/api.html)
var express = require('express'),

	// - [Logging](logging.html)
	log = require('../logging'),
	// - [Process Manager](process-manager.html)
	pm = require('../process-manager'),

	db = global.db,
	geb = global.eventBackbone;

var router = module.exports = express.Router();

router.use('/*', (req, res, next) => {
	if(req.session.pub.isAdmin) next();
	else res.status(401).send('You are not admin, you böse bueb you!');
});

router.post('/createuser', (req, res) => {
	if(req.body.username && req.body.password) {
		db.getUsers().then((arrUsers) => {
			let arrUserNames = arrUsers.map((o) => o.username);
			if(arrUserNames.indexOf(req.body.username) > -1) {
				let e = new Error('User already existing!');
				e.statusCode = 409;
				throw e;
			} else return {
				username: req.body.username,
				password: req.body.password,
				isAdmin: req.body.isAdmin
			}
		})
		.then((oUser) => db.storeUser(oUser))
		.then((oUser) => {
			log.info('SRVC:ADMIN |User stored... starting up his dedicated process');
			pm.startWorker(oUser, (err) => {
				let msg = 'New user "'+oUser.username+'" created!';
				if(err) {
					log.warn('SRVC:ADMIN |Starting of process for user "'+oUser.username+'" failed!');
					msg += ' But starting of process failed!';
				}
				log.info('SRVC:ADMIN |New user "'+oUser.username+'" created by "'+req.session.pub.username+'"!');
				res.send(msg);
				geb.emit('user:new', oUser);
			});
		})
		.catch(db.errHandler(res));
	}
	else res.status(400).send('Missing parameter for this command!');
});

router.post('/deleteuser', (req, res) => {
	var uid = parseInt(req.body.userid);
	if(uid === req.session.pub.id) {
		res.status(403).send('You dream du! You really shouldn\'t delete yourself!')
	} else {
		db.deleteUser(uid).then(() => {
			log.info('SRVC:ADMIN |User "'+req.body.username+'" deleted by "'+req.session.pub.username+'"!');
			log.warn('SRVC:ADMIN | Remove all rules, all ADs and all ETs from user!');
			res.send('User "'+req.body.username+'" deleted!');
			// TODO req.body.username should not be used, but yeah it's anyways only the admin who can use it 
			pm.killWorker(uid, req.body.username, (err) => {
				if(err) log.error(err);
			});
		})
		.catch(db.errHandler(res))
	}
});