'use strict';

// Administration Service
// ======================
// > Handles admin requests, such as create new user

// **Loads Modules:**

// - External Modules: [express](http://expressjs.com/api.html)
var express = require('express'),

	// - [Logging](logging.html)
	log = require('../logging'),
	pm = require('../process-manager'),

	db = global.db,
	geb = global.eventBackbone;
	// ,
	// pathUsers = path.resolve(__dirname, '..', '..', 'config', 'users.json');

var router = module.exports = express.Router();

router.use('/*', (req, res, next) => {
	if(req.session.pub.isAdmin) next();
	else res.status(401).send('You are not admin, you böse bueb you!');
});

router.post('/createuser', (req, res) => {
	if(req.body.username && req.body.password) {
		db.getUsers((err, arrUsers) => {
			let arrUserNames = arrUsers.map((o) => o.username);
			if(arrUserNames.indexOf(req.body.username) > -1) {
				res.status(409).send('User already existing!'); 
			} else {	
				let oUser = {
					username: req.body.username,
					password: req.body.password,
					isAdmin: req.body.isAdmin
				};
				db.storeUser(oUser, (err) => {
					if(err) {
						log.error('SRVC:ADMIN |Unable to create user!', err);
						res.status(500).send('Unable to create user!');
					} else {
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
					}
				});
			}
		});
	}
	else res.status(400).send('Missing parameter for this command!');
});

router.post('/deleteuser', (req, res) => {
	var uid = parseInt(req.body.userid);
	if(uid === req.session.pub.id) {
		res.status(403).send('You dream du! You really shouldn\'t delete yourself!')
	} else {
		db.deleteUser(uid, (err) => {
			if(err) {	
				res.status(500).send('Can\'t delete user!');
				log.error('SRVC:ADMIN | Can\'t delete user!', err);
			} else {
				log.info('SRVC:ADMIN |User "'+req.body.username+'" deleted by "'+req.session.pub.username+'"!');
				log.warn('SRVC:ADMIN | Remove all rules, all ADs and all ETs from user!');
				res.send('User "'+req.body.username+'" deleted!');
				// FIXME we also need to deactivate all running event pollers
			}
		});
	}
});