'use strict';

// HTTP Listener
// =============
// > Receives the HTTP requests to the server at the given port. The requests
// > (bound to a method) are then redirected to the appropriate handler which
// > takes care of the request.

var db = global.db,

	// **Loads Modules:**

	// - [Logging](logging.html)
	log = require('./logging'),

	// - Node.js Modules: [path](http://nodejs.org/api/path.html) and
	//   [fs](http://nodejs.org/api/fs.html)
	path = require('path'),
	fs = require('fs'),

	// - External Modules: [express](http://expressjs.com/api.html)
	//   [body-parser](https://github.com/expressjs/body-parser)
	//   [swig](http://paularmstrong.github.io/swig/)
	express = require('express'),
	session = require('express-session'),
	bodyParser = require('body-parser'),
	swig = require('swig'),

	app = express();

// Initializes the request routing and starts listening on the given port.
exports.init = (conf) => {
	if(conf.mode !== 'productive') {
		app.set('view cache', false);
		swig.setDefaults({ cache: false });
	}

	app.engine('html', swig.renderFile);
	app.set('view engine', 'html');
	app.set('views', __dirname+'/views');

	app.use(session({
		secret: Math.random().toString(36).substring(2),
		resave: false,
		saveUninitialized: true
	}));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));


	function serveSession(req) {
		return {
			system: { name: conf.name },
			user: req.session.pub
		}
	}
	// **Requests Routings:**

	// Redirect the views that will be loaded by the swig templating engine
	app.get('/', (req, res) => res.render('index', serveSession(req)));
		
	// - ** _"/"_:** Static redirect to the _"webpages/public"_ directory
	app.use('/', express.static(path.resolve(__dirname, '..', 'webapp')));

	app.get('/views/*', (req, res) => {
		if(req.session.pub || req.params[0]==='login') {
			if(req.params[0]==='admin' && !req.session.pub.isAdmin)
				res.render('401_admin', serveSession(req));
			else
				res.render(req.params[0], serveSession(req));
		}
		else res.render('401');
	});

	app.use('/service/*', (req, res, next) => {
		if(req.session.pub || req.params[0]==='session/login') next();
		else res.status(401).send('Not logged in!');
	});

	// Dynamically load all services from the services folder
	log.info('LOADING WEB SERVICES: ');
	let arrServices = fs.readdirSync(path.resolve(__dirname, 'services'))
		.filter((d) => d.substring(d.length-3) === '.js');

	for(let i = 0; i < arrServices.length; i++) {
		let fileName = arrServices[i];	
		log.info('  -> '+fileName);
		let servicePath = fileName.substring(0, fileName.length-3);
		let modService = require(path.resolve(__dirname, 'services', fileName));
		app.use('/service/'+servicePath, modService);
	}

	// If the routing is getting down here, then we didn't find anything to do and
	// tell the user that he ran into a 404, Not found
	app.get('*', (req, res, next) => {
		let err = new Error('Request from "'+req.ip+'" produced error making '+req.method+' request: '+req.originalUrl);
		err.status = 404;
		next(err);
	});

	// Handle errors
	app.use((err, req, res, next) => {
		if(req.method === 'GET') {
			res.status(404);
			res.render('404', serveSession(req));
		} else {
			log.error(err);
			res.status(500).send('There was an error while processing your request!');
		}
	});

	let server = app.listen(conf.httpport);
	log.info('HL | Started listening on port '+conf.httpport);

	server.on('listening', () => {
		let port = server.address().port;
		if(port !== conf.httpport) {
			log.error(addr.port, conf.httpport);
			log.error('HL | OPENED HTTP-PORT IS NOT WHAT WE WANTED!!! Shutting down!');
			process.exit();
		}
	});

	server.on('error', (err) => {
		// Error handling of the express port listener requires special attention,
		// thus we have to catch the error, which is issued if the port is already in use.
		switch(err.errno) {
			case 'EADDRINUSE':
				log.error(err, 'HL | HTTP-PORT ALREADY IN USE!!! Shutting down!');
				break;
			case 'EACCES':
				log.error(err, 'HL | HTTP-PORT NOT ACCSESSIBLE!!! Shutting down!');
				break;
			default:
				log.error(err, 'HL | UNHANDLED SERVER ERROR!!! Shutting down!');
		}
		process.exit();
	});
}



