'use strict';

// Serve ACTION DISPATCHERS
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

geb.addListener('system:init', () => {
	db.getAllActionDispatchers()
		.then((arr) => {
			for(let i = 0; i < arr.length; i++) {
				geb.emit('module:new', arr[i]);
			}
		})
		.catch((err) => log.error(err));
});

router.post('/get', (req, res) => {
	log.info('SRVC:AD | Fetching all');
	db.getAllActionDispatchers()
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/get/:id', (req, res) => {
	log.info('SRVC:AD | Fetching one by id: ' + req.params.id);
	db.getActionDispatcher(req.params.id)
		.then((oADs) => res.send(oADs))
		.catch(db.errHandler(res));
});

// TODO IMPLEMENT
router.post('/create', (req, res) => {
	log.info('SRVC:AD | Create: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body
	};
	console.log('GOT globals', req.body.globals);
	storeModule(args)
		.then((ad) => {
			log.info('SRVC:AD | Module stored');
			res.send('Action Dispatcher stored!')
			geb.emit('module:new', ad);
		})	
		.catch(db.errHandler(res));
});

router.post('/update', (req, res) => {
	log.info('SRVC:AD | UPDATE: ' + req.body.name);
	let args = {
		userid: req.session.pub.id,
		username: req.session.pub.username,
		body: req.body,
		id: req.body.id
	};
	storeModule(args)
		.then((ad) => {
			log.info('SRVC:AD | Module stored');
			res.send('Action Dispatcher stored!')
			geb.emit('module:update', ad);
		})	
		.catch(db.errHandler(res));
});

function storeModule(args) {
	let ab = args.body;
	return db.getAllActionDispatchers(args.userid)
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
			log.info('SRVC:AD | Running AD ', ab.name);
			return dynmod.runStringAsModule(ab.code, ab.lang, args.username, options)
		})
		.then((oMod) => {
			log.info('SRVC:AD | Storing module "'+ab.name+'" with functions '+Object.keys(oMod.functions).join(', '));
			let oModule = ab;
			delete oModule.id; // If the ID is set it is an update of an existing module
			oModule.comment = oMod.comment;
			oModule.functions = oMod.functions;

			if(args.id) return db.updateActionDispatcher(args.userid, args.id, oModule);
			else return db.createActionDispatcher(args.userid, oModule);
		})
}

router.post('/delete', (req, res) => {
	log.info('SRVC:AD | DELETE: #' + req.body.id);
	db.deleteActionDispatcher(req.session.pub.id, req.body.id)
		.then(() => res.send('Deleted!'))
		.catch(db.errHandler(res));
});
