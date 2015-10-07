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

	db = global.db,
	geb = global.eventBackbone,
	pathModules = path.resolve(__dirname, '..', '..', 'config', 'allowedmodules.json'),
	arrModules = [];

var router = module.exports = express.Router();

router.post('/get', (req, res) => res.send(arrModules));

router.post('/reload', (req, res) => {
	if(req.session.pub.isAdmin) {
		reloadModules((err, arrModules) => {
			res.send(arrModules);
		});
	}
	else res.status(409).send('Nope!');
});

function reloadModules(cb) {
	var arrAllowed = JSON.parse(fs.readFileSync(pathModules));

	log.info('SRVC:MODS | Found '+arrAllowed.length+' allowed modules');
	log.info('SRVC:MODS | Fetching available modules and their version');
	cp.exec('npm list --depth=0', function(error, stdout, stderr) {
		let arrLines = stdout.split('\n');
		let arrPromises = [];
		log.info('SRVC:MODS | Found '+(arrLines.length-1)+' available modules, Fetching their description... This will take a while!');
		for(let i = 0; i < arrLines.length; i++) {
			let arrLine = arrLines[i].split(' ');
			if(arrLine.length > 1) {
				let arrMod = arrLine[1].split('@');
				if(arrMod.length > 1) {
					arrPromises.push(getModuleDescription(arrMod[0], arrMod[1]));
				}
			}
		}
		Promise.all(arrPromises).then((arrMods) => {
			log.info('SRVC:MODS | Descriptions for all modules loaded');
			arrModules = arrMods;
			updateAllowedFlag(arrAllowed);
			cb(null, arrMods);
		},
		(err) => {
			log.error('SRVC:MODS | ERROR: ' + err);
			cb(err);
		});
	});
}
// Load existing modules and their description
function getModuleDescription(module, version) {
	return new Promise((fulfill, reject) => {
		// cp.exec('npm view '+module+' description', function(error, stdout, stderr) {
		cp.exec('npm view '+module+' description -loglevel silent', function(error, stdout, stderr) {
			if(error) reject(error);
			else fulfill({
				module: module,
				version: version,
				description: stdout.substring(0, stdout.length-1)
			});
		});
	});
}
function updateAllowedFlag(arrAllowed) {
	for(let i = 0; i < arrModules.length; i++) {
		arrModules[i].allowed = (arrAllowed.indexOf(arrModules[i].module) > -1);
	}
}


router.post('/allow', (req, res) => {
	if(req.session.pub.isAdmin) {
		var arrAllowed = JSON.parse(fs.readFileSync(pathModules));
		if(arrAllowed.indexOf(req.body.module) === -1) {
			try {
				arrAllowed.push(req.body.module);
				updateAllowedFlag(arrAllowed);
				fs.writeFileSync(pathModules, 'utf-8', JSON.stringify(arrAllowed, null, 2));
				res.send('Module now allowed!');
				log.info('SRVC:MODS | Module set as allowed: '+req.body.module);
			} catch(err) {
				res.status(500).send(err);
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
				fs.writeFileSync(pathModules, 'utf-8', JSON.stringify(arrAllowed, null, 2));
				res.send('Module now forbidden!');
				log.info('SRVC:MODS | Module set as forbidden: '+req.body.module);
			} catch(err) {
				res.status(500).send(err);
			}
		} else res.status(400).send('ehm... this is already forbidden!?')
	}
	else res.status(409).send('Nope!');
});

reloadModules((err, res)=>{
console.log(err);
console.log(res);
});