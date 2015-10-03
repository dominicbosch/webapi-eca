'use strict';

// Serve Rules
// ===========
// > Answers rule requests from the user

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db;

var router = module.exports = express.Router();

router.post('/getall', (req, res) => {
	log.info('SRVC | RULES | Fetching all Rules');
	db.getAllRules(req.session.pub.username, (err, arr) => {
			if(err) res.status(500).send('Fetching all rules failed');
			else res.send(arr);
	});
})