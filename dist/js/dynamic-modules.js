'use strict';

// Dynamic Modules
// ===============
// > Compiles CoffeeScript modules and loads JS modules in a VM, together
// > with only a few allowed node.js modules.

// **Loads Modules:**
// - [Logging](logging.html)
var log = require('./logging'),

	// - Node.js Modules: [vm](http://nodejs.org/api/vm.html) and
	vm = require('vm'),

	// - External Modules: [coffee-script](http://coffeescript.org/) and
	cs = require('coffee-script'),
	//       [request](https://github.com/request/request)
	request = require('request'),
	geb = global.eventBackbone,
	arrAllowed = [];

function throwStatusCode(code, msg) {
	let e = new Error(msg);
	e.statusCode = code;
	throw e;
}

exports.newAllowedModuleList = function(arr) {
	log.info('DM | Got new allowed modules list: '+arr.join(', '));
	arrAllowed = arr;
};

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
				if(line.substring(0, 1) === '#' && line.substring(0, 3) !== '###')
					comm += line.substring(1).trim()+'\n';
			} else {
				if(line.substring(0, 2) === '//')
					comm += line.substring(2).trim()+'\n';
			}
		}
	}
	return comm;
}

// Attempt to run a JS module from a string, together with the
// given parameters and arguments. If it is written in CoffeeScript we
// compile it first into JS.
// Options: id, globals, logger
exports.runStringAsModule = (code, lang, username, opt) => {
	return new Promise((resolve) => {
		var origCode = code;

		if(!code || !lang || !username) {
			throwStatusCode(400, 'Missing parameters!');
		}

		opt = opt || {}; // In case user didn't pass this
		if(!opt.id) opt.id = 'TMP|'+Math.random().toString(36).substring(2)+'.vm';
		if(!opt.globals) opt.globals = {};
		if(!opt.persistence) opt.persistence = {};
		if(typeof opt.logger !== 'function') opt.logger = () => {};
		if(typeof opt.datalogger !== 'function') opt.datalogger = () => {};
		if(typeof opt.persist !== 'function') opt.persist = () => {};
		if(!opt.modules) opt.modules = [];

		if(lang === 'CoffeeScript') {
			try {
				log.info('DM | Compiling module "'+opt.id+'" for user "'+username);
				code = cs.compile(code);
			} catch(err) {
				throwStatusCode(400, 'Compilation of CoffeeScript failed at line '+err.location.first_line);
			}
		}

		log.info('DM | Running module "'+opt.id+'" for user '+username);
		// The sandbox contains the objects that are accessible to the user.
		// Eventually they need to be required from a vm themselves 
		let sandbox = {
			id: opt.id,
			params: opt.globals,
			log: opt.logger,
			datalog: opt.datalogger,
			modules: {},
			exports: {},
			persistence: opt.persistence,
			persist: () => opt.persist(opt.persistence),
			sendEvent: (hook, evt) => {
				let options = {
					uri: hook,
					method: 'POST',
					json: true ,
					body: evt
				}
				request(options, (err, res, body) => {
					if(err || res.statusCode !== 200) 
						opt.logger('ERROR('+__filename+') REQUESTING: '+hook+' ('+(new Date())+')');
				});
			}
		}

		// Attach all modules that are required and allowed for the coders, as defined by the administrator or initially also in config/allowedmodules.json
		for (var i = 0; i < opt.modules.length; i++) {
			let mod = opt.modules[i];
			if(arrAllowed.indexOf(mod) > -1) {
				try {
					opt.logger(' --> | Loading external module "'+mod+'"...');
					sandbox.modules[mod] = require(mod);
					// delete require.cache[require.resolve('./b.js')]
					// console.log('DM| cache adding', require.resolve(mod));
					// console.log('DM|now has cache', Object.keys(require.cache));
				} catch(err) {
					opt.logger('ERROR: Module not found: ' + mod);
				}
			} else {
				opt.logger('ERROR: Tried to load module which was not allowed! ' + opt.modules[i]);
			}
		}

		try {
			// Finally the module is run in a VM
			vm.runInNewContext(code, sandbox, sandbox.id);
		} catch(err) {
			let msg = 'Loading Module failed: '
			if(err.message) msg += err.message;
			else msg += 'Try to run the script locally to track the error!';
			throwStatusCode(400, msg);
		}
		log.info('DM | Module "'+opt.id+'" ran successfully for user '+username);

		// Now that the module ran successfully we can extract the argument names from all the exported functions
		let oFunctions = {};
		for(let func in sandbox.exports) {
			oFunctions[func] = getFunctionArgumentsAsStringArray(sandbox.exports[func]);
		}
		resolve({
			module: sandbox.exports,
			comment: searchComment(lang, origCode),
			functions: oFunctions
		});
	});
}