'use strict';

// Administration Service
// ======================
// > Handles admin requests, such as create new user

// **Loads Modules:**

// - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
var fs = require('fs'),

	// [path](http://nodejs.org/api/path.html)
	path = require('path'),
	
	// [child_process](http://nodejs.org/api/child_process.html)
	cp = require('child_process'),

	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),

	// - [Logging](logging.html)
	log = require('../logging'),

	// - [Logging](logging.html)
	dm = require('../dynamic-modules'),

	db = global.db,
	geb = global.eventBackbone,
	pathModules = path.resolve(__dirname, '..', '..', 'config', 'allowedmodules.json'),
	arrModules = [];

var router = module.exports = express.Router();

router.post('/get', (req, res) => res.send(arrModules));

router.post('/reload', (req, res) => {
	if(req.session.pub.isAdmin) {
		reloadModules((err, arr) => {
			if(err) {
				log.error(err);
				res.status(500).send('Erorr reloading modules!')
			} else res.send(arr);
		});
	}
	else res.status(409).send('Nope!');
});

function reloadModules(cb) {
	log.info('SRVC:MODS | Fetching available modules and their version');
	cp.exec('npm list --depth=0', function(err, stdout) {
		let arrLines = stdout.split('\n');
		arrModules = [];
		log.info('SRVC:MODS | Found '+(arrLines.length)+' available modules, Fetching their package information!');
		for(let i = 0; i < arrLines.length; i++) {
			let arrLine = arrLines[i].split(' ');
			if(arrLine.length > 1) {
				let arrMod = arrLine[1].split('@');
				if(arrMod.length > 1) {
					let m = require(arrMod[0]+'/package.json'); // Neat magic ;)
					arrModules.push({
						name: arrMod[0],
						version: m.version,
						description: m.description
					});
				}
			}
		}
		log.info('SRVC:MODS | Descriptions for all modules loaded');
		let arrAllowed = JSON.parse(fs.readFileSync(pathModules));
		log.info('SRVC:MODS | Found '+arrAllowed.length+' allowed modules');
		updateAllowedFlag(arrAllowed);
		dm.newAllowedModuleList(arrAllowed);
		geb.emit('modules:list', arrAllowed);
		setTimeout(() => {
			log.warn('SRVC:MODS | Telling everbody that allowed modules have been distributed... Maybe this is a lie...')
			geb.emit('modules:init')
		}, 5*1000);
		cb(undefined, arrModules)
	});
}

function updateAllowedFlag(arrAllowed) {
	for(let i = 0; i < arrModules.length; i++) {
		arrModules[i].allowed = (arrAllowed.indexOf(arrModules[i].name) > -1);
	}
}

router.post('/allow', (req, res) => {
	if(req.session.pub.isAdmin) {
		var arrAllowed = JSON.parse(fs.readFileSync(pathModules));
		if(arrAllowed.indexOf(req.body.module) === -1) {
			try {
				arrAllowed.push(req.body.module);
				updateAllowedFlag(arrAllowed);
				fs.writeFileSync(pathModules, JSON.stringify(arrAllowed, null, 2));
				res.send('Module "'+req.body.module+'" now allowed!');
				log.info('SRVC:MODS | Module set as allowed: '+req.body.module);
			} catch(err) {
				log.error(err);
				res.status(500).send('Unable to persist your changes!');
			}

		} else res.status(400).send('ehm... this is already allowed!?')
	}
	else res.status(409).send('Nope!');
});

router.post('/forbid', (req, res) => {
	if(req.session.pub.isAdmin) {
		let arrAllowed = JSON.parse(fs.readFileSync(pathModules));
		let i = arrAllowed.indexOf(req.body.module);
		if(i > -1) {
			try {
				arrAllowed.splice(i, 1);
				updateAllowedFlag(arrAllowed);
				fs.writeFileSync(pathModules, JSON.stringify(arrAllowed, null, 2));
				res.send('Module "'+req.body.module+'" now forbidden!');
				log.info('SRVC:MODS | Module set as forbidden: '+req.body.module);
			} catch(err) {
				log.error(err);
				res.status(500).send('Unable to persist your changes!');
			}
		} else res.status(400).send('ehm... this is already forbidden!?')
	}
	else res.status(409).send('Nope!');
});

geb.addListener('system:init', () => reloadModules(() => {}) );