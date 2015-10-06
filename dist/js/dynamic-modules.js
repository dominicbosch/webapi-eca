'use strict';

// Dynamic Modules
// ===============
// > Compiles CoffeeScript modules and loads JS modules in a VM, together
// > with only a few allowed node.js modules.

// **Loads Modules:**
// - [Logging](logging.html)
var log = require('./logging'),
	// - [Encryption](encryption.html)
	encryption = require('./encryption'),

	// - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
	vm = require('vm'),
	//   [fs](http://nodejs.org/api/fs.html),
	fs = require('fs'),
	//   [path](http://nodejs.org/api/path.html) and
	path = require('path'),

	// - External Modules: [coffee-script](http://coffeescript.org/) and
	cs = require('coffee-script'),
	//       [request](https://github.com/request/request)
	request = require('request'),
	geb = global.eventBackbone,
	oModules = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config', 'modules.json')));

geb.addListener('system:init', (msg) => {
	// Replace the properties with the actual loaded modules
	log.info('DM | Preloading modules ' + Object.keys(oModules).join(', '));
	for(let mod in oModules) {
		try {
			oModules[mod] = require(oModules[mod].module);
			log.info('DM | Loaded module ' + mod);
		} catch(err) {
			log.error('DM | Module not found: ' + mod);
		}
	}
});

let regexpComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
function getFunctionArgumentsAsStringArray(func){	
	let fnStr = func.toString().replace(regexpComments, '');
	return fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g) || [];
}

function searchComment(lang, src) {	
	var arrSrc = src.split('\n'),
		comm = '';

	for(let i = 0; i < arrSrc.length; i++) {
		let line = arrSrc[i].trim();
		if(line !== '') {
			if(lang === 'CoffeeScript') {
				if(line.substring(0, 1) === '#' && line.substring(1, 3) !== '###')
					comm += line.substring(1)+'\n';
			} else {
				if(line.substring(0, 2) === '//')
					comm += line.substring(2)+'\n';
			}
		}
	}
	return comm;
}


// Attempt to run a JS module from a string, together with the
// given parameters and arguments. If it is written in CoffeeScript we
// compile it first into JS.
exports.runStringAsModule = (moduleId, src, lang, oGlobalVars, logFunction, oUser, cb) => {
	if(typeof cb !== 'function') return log.error('DM | No callback provided!');

	if(!moduleId || !src || !lang || !oGlobalVars || !logFunction || !oUser) {
		return cb({
			code: 500,
			message: 'Missing arguments!'
		});
	}

	if(lang === 'CoffeeScript') {
		try {
			log.info('DM | Compiling module "'+moduleId+'" for user "'+oUser.username);
			src = cs.compile(src);
		} catch(err) {
			return cb({
				code: 400,
				message: 'Compilation of CoffeeScript failed at line '+err.location.first_line
			});
		}
	}

	// Decrypt encrypted user parameters to ensure some level of security when it comes down to storing passwords on our server.
	for(let prop in oGlobalVars) {
		log.info('DM | Loading user defined global variable '+prop);
		oGlobalVars[prop] = encryption.decrypt(oGlobalVars[prop].value);
	}

	log.info('DM | Running module "'+moduleId+'" for user '+oUser.username);
	// The sandbox contains the objects that are accessible to the user.
	// Eventually they need to be required from a vm themselves 
	let sandbox = {
		id: moduleId,
		params: oGlobalVars,
		log: logFunction,
		exports: {},
		sendEvent: (hook, evt) => {	
			let options = {
				uri: hook,
				method: 'POST',
				json: true ,
				body: evt
			}
			request(options, (err, res, body) => {
				if(err || res.statusCode !== 200) 
					logFunction('ERROR('+__filename+') REQUESTING: '+hook+' ('+(new Date())+')');
			});
		}
	}

	// Attach all modules that are allowed for the coders, as defined in config/modules.json
	for(let mod in oModules) {
		sandbox[mod] = oModules[mod];
	}

	// FIXME ENGINE BREAKS if non-existing module is used??? 
	try {
		// Finally the module is run in a VM
		vm.runInNewContext(src, sandbox, sandbox.id);
	} catch(err) {
		let oReply = {
			code: 400,
			message: 'Loading Module failed: '
		};
		if(err.message) oReply.message += err.message;
		else oReply.message += 'Try to run the script locally to track the error!';
		return cb(oReply);
	}
	log.info('DM | Module "'+moduleId+'" ran successfully for user '+oUser.username);

	// Now that the module ran successfully we can extract the argument names from all the exported functions
	let oFunctionsArguments = {};
	for(let func in sandbox.exports) {
		oFunctionsArguments[func] = getFunctionArgumentsAsStringArray(sandbox.exports[func]);
	}
	cb(null, {
		module: sandbox.exports,
		comment: searchComment(lang, src),
		functionArgs: oFunctionsArguments
	});
}
