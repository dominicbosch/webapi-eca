'use strict';

// Serve WORKERS
// ========================

// **Loads Modules:**

// - [Logging](logging.html)
let log = require('../logging'),
	pm = require('../process-manager'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

function isAdminOrUser(req, res, next) {
	if(req.session.pub.isAdmin || req.body.username === req.session.pub.username) next();
	else res.status(401).send('You can only manage your own worker!');
}

router.post('/state/start', isAdminOrUser, (req, res) => {
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

router.post('/state/kill', isAdminOrUser, (req, res) => {
	db.getUserByName(req.body.username)
		.then((oUser) => pm.killWorker(oUser.id, oUser.username))
		.then(() => res.send('Done'))
		.catch(db.errHandler(res));
});


router.post('/get', isAdminOrUser, (req, res) => {
	db.getWorker(req.body.username)
		.then((oWorker) => res.send(oWorker))
		.catch(db.errHandler(res));
});

router.post('/log/delete', isAdminOrUser, (req, res) => {
	db.deleteWorkerLog(req.session.pub.id)
		.then(() => res.send('Worker log deleted!'))
		.catch(db.errHandler(res));
});

router.post('/memsize', (req, res) => { res.send(''+pm.getMaxMem()) });