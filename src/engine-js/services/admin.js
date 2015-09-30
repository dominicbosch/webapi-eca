'use strict';

// Administration Service
// ======================
// > Handles admin requests, such as create new user

// **Loads Modules:**

// - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
var fs = require('fs'),

	// [path](http://nodejs.org/api/path.html)
	path = require('path'),

	// - [Logging](logging.html)
	log = require('../logging'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),

	db = global.db,
	pathUsers = path.resolve(__dirname, '..', '..', 'config', 'users.json');

var router = module.exports = express.Router();

router.use('/*', (req, res, next) => {
	if(req.session.pub.admin === 'true') next();
	else res.status(401).send('You are not admin, you böse bueb you!');
});

router.post('/createuser', (req, res) => {
	if(req.body.username && req.body.password) {
		db.getUserIds((err, arrUsers) => {
			if(arrUsers.indexOf(req.body.username) > -1) {
				res.status(409).send('User already existing!'); 
			} else {	
				let oUser = {
					username: req.body.username,
					password: req.body.password,
					admin: req.body.isAdmin
				};
				db.storeUser(oUser);
				log.info('New user "'+oUser.username+'" created by "'+req.session.pub.username+'"!');
				res.send('New user "'+oUser.username+'" created!');
			}
		});
	}
	else res.status(400).send('Missing parameter for this command!');
});

router.post('/deleteuser', (req, res) => {
	log.warn('SERVC ADMIN | Tits really an ID here?');
	if(req.body.userid === req.session.pub.id) {
		res.status(403).send('You dream du! You really shouldn\'t delete yourself!')
	} else {
		db.deleteUser(req.body.username);
		log.info('User "'+req.body.username+'" deleted by "'+req.session.pub.username+'"!');
		res.send('User "'+req.body.username+'" deleted!');
		// FIXME we also need to deactivate all running event pollers
	}
})