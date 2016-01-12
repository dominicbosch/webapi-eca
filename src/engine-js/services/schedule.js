'use strict';

// Serve ACTION DISPATCHERS
// ========================

// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),
	// - External Modules: [express](http://expressjs.com/api.html)
	express = require('express'),
	db = global.db,
	geb = global.eventBackbone,
	router = module.exports = express.Router();

router.post('/get', (req, res) => {
	log.info('SRVC:SH | Fetching all');
	db.getSchedule(req.session.pub.id)
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/get/:id', (req, res) => {
	log.info('SRVC:SH | Fetching Distinct');
	db.getSchedule(req.session.pub.id, req.params.id)
		.then((arr) => res.send(arr))
		.catch(db.errHandler(res));
});

router.post('/create', (req, res) => {
	log.info('SRVC:SH | Creating new Schedule');
	storeSchedule(req.session.pub.id, 'create', req.body, res);
});

router.post('/update', (req, res) => {
	log.info('SRVC:SH | Updating existing Schedule #'+req.body.id);
	storeSchedule(req.session.pub.id, 'update', req.body, res);
});

router.post('/delete', (req, res) => {
	log.info('SRVC:SH | Deleting Schedule #' +req.body.id);
	db.deleteSchedule(req.session.pub.id, req.body.id)
		.then(() => {
			geb.emit('schedule:stop', req.body.id);
			res.send('Schedule deleted!')
		})
		.catch(db.errHandler(res))
});

router.post('/getlog/:id', (req, res) => {
	log.info('SRVC:SH | Fetching Schedule log');
	db.getScheduleLog(req.session.pub.id, req.params.id)
		.then((log) => res.send(log))
		.catch(db.errHandler(res));
});

router.post('/clearlog/:id', (req, res) => {
	log.info('SRVC:SH | Clearing Schedule log #'+req.params.id);
	db.clearScheduleLog(req.session.pub.id, req.params.id)
		.then(() => res.send('Thanks!'))
		.catch(db.errHandler(res));
});

router.get('/getdatalog/:id', (req, res) => {
	log.info('SRVC:SH | Fetching all Schedule data logs');
	db.getScheduleDataLog(req.session.pub.id, req.params.id)
		.then((log) => {
			res.set('Content-Type', 'text/json')
				.set('Content-Disposition', 'attachment; filename=datalog_schedule_'+req.params.id+'.json')
				.send(log)
		})
		.catch(db.errHandler(res));
});

router.post('/cleardatalog/:id', (req, res) => {
	log.info('SRVC:SH | Clearing Schedule data log #'+req.params.id);
	db.clearScheduleDataLog(req.session.pub.id, req.params.id)
		.then(() => db.logSchedule(req.params.id, 'Data Log deleted!'))
		.then(() => res.send('Thanks!'))
		.catch(db.errHandler(res));
});

function storeSchedule(uid, reason, body, res) {
	let oSchedule = {
		name: body.name,
		error: null,
		execute: body.execute,
		text: body.schedule.text,
		running: true
	};
	let prom;
	if(reason === 'create') prom = db.createSchedule(uid, oSchedule, body.execute.id)
	else prom = db.updateSchedule(uid, body.id, oSchedule, body.execute.id)
	prom.then((oSchedule) => {
			geb.emit('schedule:start', {
				uid: uid,
				schedule: oSchedule
			});
			res.send({ id: oSchedule.id });
		})
		.catch(db.errHandler(res))
}

router.post('/start/:id', (req, res) => {
	log.info('SRVC:SH | Starting: #' + req.params.id);
	db.startStopSchedule(req.session.pub.id, req.params.id, true, req.body)
		.then((oSched) => {
			log.info('SRVC:SH | Module started');
			res.send('OK');
			geb.emit('schedule:start', {
				uid: req.session.pub.id,
				schedule: oSched
			});
		})	
		.catch(db.errHandler(res));
});

router.post('/stop/:id', (req, res) => {
	log.info('SRVC:SH | Stopping: #' + req.params.id);
	db.startStopSchedule(req.session.pub.id, req.params.id, false)
		.then(() => {
			log.info('SRVC:SH | Module stopped');
			res.send('OK');
			geb.emit('schedule:stop', {
				uid: req.session.pub.id,
				sid: req.params.id
			});
		})	
		.catch(db.errHandler(res));
});