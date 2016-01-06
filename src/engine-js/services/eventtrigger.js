'use strict';

// Serve EVENT TRIGGERS
// ========================

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - [Dynamic Modules](dynamic-modules.html)
	dynmod = require('../dynamic-modules'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

router.post('/get', (req, res) => {
	log.info('SRVC:ET | Fetching all');
	db.getAllEventTriggers()
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/get/:id', (req, res) => {
	log.info('SRVC:ET | Fetching one by id: ' + req.params.id);
	db.getEventTrigger(req.params.id)
		.then((oETs) => res.send(oETs))
		.catch(db.errHandler(res));
});

router.post('/create', (req, res) => {
	log.info('SRVC:ET | Create: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body
	};
	storeModule(args)
		.then((et) => {
			log.info('SRVC:ET | Module created');
			res.send(et)
			geb.emit('eventtrigger:new', et);
		})	
		.catch(db.errHandler(res));
});

router.post('/start/:id', (req, res) => {
	log.info('SRVC:ET | Starting: #' + req.params.id);
	db.startStopEventTrigger(req.session.pub.id, req.params.id, true, req.body)
		.then(() => {
			log.info('SRVC:ET | Module started');
			res.send('OK');
			geb.emit('eventtrigger:start', {
				uid: req.session.pub.id,
				eid: req.params.id,
				globals: req.body
			});
		})	
		.catch(db.errHandler(res));
});

router.post('/stop/:id', (req, res) => {
	log.info('SRVC:ET | Stopping: #' + req.params.id);
	db.startStopEventTrigger(req.session.pub.id, req.params.id, false)
		.then(() => {
			log.info('SRVC:ET | Module stopped');
			res.send('OK');
			geb.emit('eventtrigger:stop', {
				uid: req.session.pub.id,
				eid: req.params.id
			});
		})	
		.catch(db.errHandler(res));
});

router.post('/update', (req, res) => {
	log.info('SRVC:ET | UPDATE: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body,
		id: req.body.id
	};
	storeModule(args)
		.then((et) => {
			log.info('SRVC:ET | Module updated');
			res.send('Event Trigger stored!');
			geb.emit('eventtrigger:new', et);
		})	
		.catch(db.errHandler(res));
});

function storeModule(args) {
	let ab = args.body;
	return db.getAllEventTriggers(args.userid)
		.then((arr) => {
			arr = arr || [];
			if(args.id) arr = arr.filter((o) => o.id !== parseInt(args.id));
			let arrNames = arr.map((o) => o.name);
			if(arrNames.indexOf(ab.name) > -1) {
				db.throwStatusCode(409, 'Module name already existing: '+ab.name);
			}
		})
		.then(() => {
			let options = { globals: {} };
			for(let el in ab.globals) options.globals[el] = 'dummy';
			log.info('SRVC:ET | Running ET ', ab.name);
			return dynmod.runStringAsModule(ab.code, ab.lang, args.username, options)
		})
		.then((oMod) => {
			log.info('SRVC:ET | Storing module "'+ab.name+'" with functions '+Object.keys(oMod.functions).join(', '));
			let oModule = ab;
			delete oModule.id; // If the ID is set it is an update of an existing module
			oModule.comment = oMod.comment;
			oModule.functions = oMod.functions;

			if(args.id) return db.updateEventTrigger(args.userid, args.id, oModule);
			else return db.createEventTrigger(args.userid, oModule);
		})
}

router.post('/delete', (req, res) => {
	log.info('SRVC:ET | DELETE: #' + req.body.id);
	db.deleteEventTrigger(req.session.pub.id, req.body.id)
		.then(() => res.send('Deleted!'))
		.catch(db.errHandler(res));
});
