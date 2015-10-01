'use strict';

// Configuration
// =============
// > Loads the configuration file and acts as an interface to it.

// - Node.js Modules: [fs](http://nodejs.org/api/fs.html) and
var fs = require('fs'),
	// [path](http://nodejs.org/api/path.html)
	path = require('path'),
	isInitialized = false;

// init( configPath )
// -----------

// Calling the init function will load the config file.
// It is possible to hand a configPath for a custom configuration file path.
exports = module.exports = {
	init: (filePath) => {
		if(isInitialized) console.error('ERROR: Already initialized configuration!');
		else {	
			isInitialized = true;
			let configPath = path.resolve(filePath || path.join(__dirname, '..', 'config', 'system.json'));
			try {
				let oConffile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', configPath)));
				// Relink all properties to the configuration object itself... wicked right? :-P
				for(let prop in oConffile) {
					exports[prop] = oConffile[prop];
				}
				// replace the config initialization routine
				exports.init = () => console.error('ERROR: Already initialized configuration!');
				exports.isInit = true
			} catch(e) {
				exports = null;
				console.error('Failed loading config file: ' + e.message);
			}
		}
	}
};
