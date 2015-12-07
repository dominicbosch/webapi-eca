'use strict';

// Serve Session
// =============
// > Answers session requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - [Encryption](encryption.html)
	encryption = require('../encryption'),
	// - [Firebase](firebase.html)
	fb = require('../persistence/firebase'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db;

var router = module.exports = express.Router();

// Associates the user object with the session if login is successful.
router.post('/login', (req, res) => {
	db.loginUser(req.body.username, req.body.password)
		.then((oUser) => {
			// no error, so we can associate the user object from the DB to the session
			req.session.pub = oUser;
			res.send('OK!');
			// req.session.dbUser = oUser.dbUser; // Future performance improvement
		})
		.catch(() => res.status(409).send('NU-UH!'));
});

// A post request retrieved on this handler causes the user object to be
// purged from the session, thus the user will be logged out.
router.post('/logout', (req, res) => {
	if(req.session) {
		delete req.session.pub;
		res.send('Bye!');
	}
});

router.post('/publickey', (req, res) => res.send(encryption.getPublicKey()));

router.post('/hostid', (req, res) => res.send(fb.getHostId()));