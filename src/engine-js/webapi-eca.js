// WebAPI-ECA Engine
// =================

'use strict';

// >This is the main module that is used to run the whole application:
// >
// >     node webapi-eca [opt]
// >
// > See below in the optimist CLI preparation for allowed optional parameters `[opt]`.

// - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
// [path](http://nodejs.org/api/path.html),
// [child_process](http://nodejs.org/api/child_process.html)
// and [events](http://nodejs.org/api/events.html)
var fs = require('fs'),
	path = require('path'),
	cp = require('child_process'),
	events = require('events'),
	db = global.db = {},
	geb = global.eventBackbone = new events.EventEmitter(),

	// **Loads Own Modules:**

	// - [Logging](logging.html)
	log = require('./logging'),

	// - [Configuration](config.html)
	conf = require('./config'),

	// - [ECA Components Manager](components-manager.html)
	cm = require('./components-manager'),

	// - [Engine](engine.html)
	engine = require('./engine'),

	// - [HTTP Listener](http-listener.html)
	http = require('./http-listener'),

	// - [Encryption](encryption.html)
	encryption = require('./encryption'),

	// - [Trigger Poller](trigger-poller.html) *(will be forked into a child process)*
	nameEP = 'trigger-poller',

	// - External Modules: [optimist](https://github.com/substack/node-optimist)
	optimist = require('optimist');

geb.addListener('eventtrigger', (msg) => console.log(msg));

// Let's prepare the optimist CLI optional arguments `[opt]`:
let usage = 'This runs your webapi-based ECA engine';
let opt = {
//  `-h`, `--help`: Display the help
	h: {
		alias : 'help',
		describe: 'Display this'
	},
//  `-c`, `--config-path`: Specify a path to a custom configuration file, other than "config/config.json"
	c: {
		alias : 'config-path',
		describe: 'Specify a path to a custom configuration file, other than "config/config.json"'
	},
//  `-w`, `--httpport`: Specify a HTTP port for the web server 
	w: {
		alias : 'httpport',
		describe: 'Specify a HTTP port for the web server'
	},
//  `-d`, `--db-port`: Specify a port for the redis DB
	d: {
		alias : 'db-port',
		describe: 'Specify a port for the redis DB'
	},
//  `-s`, `--db-db`: Specify a database
	s: {
		alias : 'db-db',
		describe: 'Specify a database identifier'
	},
//  `-m`, `--mode`: Specify a run mode: [development|productive]
	m: {
		alias : 'mode',
		describe: 'Specify a run mode: [development|productive]'
	},
//  `-i`, `--log-stdlevel`: Specify the log level for the I/O. in development expensive origin
//                           lookups are made and added to the log entries
	i: {
		alias : 'log-stdlevel',
		describe: 'Specify the log level for the standard I/O'
	},
//  `-f`, `--log-filelevel`: Specify the log level for the log file
	f: {
		alias : 'log-filelevel',
		describe: 'Specify the log level for the log file'
	},
//  `-p`, `--log-filepath`: Specify the path to the log file within the "logs" folder
	p: {
		alias : 'log-filepath',
		describe: 'Specify the path to the log file within the "logs" folder'
	},
//  `-t`, `--log-trace`: Whether full tracing should be enabled, don't use in productive mode
	t: {
		alias : 'log-trace',
		describe: 'Whether full tracing should be enabled [on|off]. do not use in productive mode.'
	},
//  `-n`, `--nolog`: Set this true if no output shall be generated
	n: {
		alias : 'nolog',
		describe: 'Set this if no output shall be generated'
	}
};

// now fetch the CLI arguments and exit if the help has been called.
let argv = optimist.usage(usage).options(opt).argv;
if(argv.help) {	
	console.log(optimist.help());
	process.exit();
}

// Let's read and initialize the configuration so we are ready to do what we are supposed to do!
conf.init(argv.c);
// > Check whether the config file is ready, which is required to start the server.
if(!conf.isInit) {
	console.error('FAIL: Config file not ready! Shutting down...');
	process.exit();
}

conf.httpport = parseInt(argv.w) || parseInt(conf.httpport) || 8125;
conf.db.module = conf.db.module || 'redis';
conf.db.port = parseInt(argv.d) || parseInt(conf.db.port) || 6379;
conf.db.db = argv.s || conf.db.db || 0;

if(!conf.log) conf.log = {};
conf.mode = argv.m || conf.mode || 'productive'
conf.log.stdlevel = argv.i || conf.log.stdlevel || 'error'
conf.log.filelevel = argv.f || conf.log.filelevel || 'warn'
conf.log.filepath = argv.p || conf.log.filepath || 'warn'
conf.log.trace = argv.t || conf.log.trace || 'off'
conf.log.nolog = argv.n || conf.log.nolog
if(!conf.log.nolog) {
	try {
		fs.writeFileSync(path.resolve(conf.log.filepath), ' ');
	} catch(e) { console.log(e) }
}
// Initialize the logger
log.init(conf);
log.info('RS | STARTING SERVER');

// This function is invoked right after the module is loaded and starts the server.
function init() {
	var dbMod;
	function exportDB() {
		for(let prop in dbMod) {
			global.db[prop] = dbMod[prop];
		}
	}

	encryption.init(conf.keygenpp);

	log.info('RS | Initialzing DB');
	dbMod = require('./persistence/'+conf.db.module);
	dbMod.init(conf.db).then(exportDB, () => {
		log.error('RS | No DB connection, shutting down system!');
		shutDown();
	}).then(handleConnectionSuccess);
}

function handleConnectionSuccess() {
	log.info('RS | Succcessfully connected to DB, Initialzing Users');
	// Load the standard users from the user config file if they are not already existing
	let pathUsers = path.resolve(__dirname, '..', 'config', 'users.json');
	let users = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));
	db.getUserIds((err, oReply) => {	
		console.log('got arr', oReply);
		for(let username in users) {
			if(oReply.indexOf(username) === -1) {
				let oUser = users[username];
				console.log('adding new user', oUser);
				oUser.username = username;
				db.storeUser(oUser);
			}
		}
	});

	// Start the trigger poller. The components manager will emit events for it
	log.info('RS | Forking a child process for the trigger poller');
	// Grab all required log config fields
	
	// Initialize the trigger poller with the required CLI arguments
	
	// !!! TODO Fork one process per event trigger module!!! This is the only real safe solution for now
	let poller = cp.fork(path.resolve(__dirname, nameEP));
	poller.send({
		intevent: 'startup',
		data: conf
	});
	fs.unlink('proc.pid', (err) => {
		if(err)	console.log(err);
		fs.writeFile('proc.pid', 'PROCESS PID: ' + process.pid + '\nCHILD PID: ' + poller.pid + '\n');
	});

	// after the engine and the trigger poller have been initialized we can
	// initialize the module manager and register event listener functions
	// from engine and trigger poller
	log.info('RS | Initialzing module manager and its event listeners');
	cm.addRuleListener(engine.internalEvent);
	cm.addRuleListener(poller.send);

	log.info('RS | Initialzing http listener');
	http.init(conf);

	log.info('RS | All good so far, informing all modules about proper system initialization');
	geb.emit('system', 'init');
}

// Shuts down the server.
function shutDown() {
	log.warn('RS | Received shut down command!');
	if(typeof db.shutDown === 'function') db.shutDown();
	engine.shutDown();

	// We need to call process.exit() since the express server in the http-listener
	// can't be stopped gracefully. Why would you stop this system anyways!?? 
	process.exit();
}

// Process Commands
// When the server is run as a child process, this function handles messages
// from the parent process (e.g. the testing suite)
process.on ('message', (cmd) => {
	// The die command redirects to the shutDown function.
	if(cmd === 'die') {	
		log.warn('RS | GOT DIE COMMAND');
		shutDown();
	} else log.warn('Received unknown command: ' + cmd);
});

process.on('SIGINT', () => {
	log.warn('RS | GOT SIGINT');
	shutDown();
});

process.on('SIGTERM', () => {
	log.warn('RS | GOT SIGTERM');
	shutDown();
});

// *Start initialization*
init();