'use strict';

// Serve ACTION DISPATCHERS
// ========================

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

router.post('/get', (req, res) => {
	log.info('SRVC:SH | Fetching all');
	db.getAllActionDispatchers()
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});
