
###

Serve ACTION DISPATCHERS
========================

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
db = global.db
# - [Dynamic Modules](dynamic-modules.html)
dynmod = require '../dynamic-modules'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

router.post '/getall', ( req, res ) ->
	log.info 'SRVC | ACTION DISPATCHERS | Fetching all'
	db.actionDispatchers.getAllModules req.session.pub.username, (err, oADs) ->
		if err
			res.status(500).send err
		else
			res.send oADs


storeModule = ( user, oBody, modType, dbMod, callback ) =>
# src, user.username, id: 'dummyRule', oBody.id, oBody.lang, 'actiondispatcher', null,
	args =
		src: oBody.data,					# code
		lang: oBody.lang,					# script language
		userId: user.username,				# userId
		modId: 'dryrun',					# moduleId
		modType: 'actiondispatcher'			# module type
		dryrun: true
	dynmod.compileString args, ( cm ) =>
		answ = cm.answ
		if answ.code is 200
			funcs = []
			funcs.push name for name, id of cm.module
			log.info "CM | Storing new module with functions #{ funcs.join( ', ' ) }"
			answ.message = 
				" Module #{ oBody.id } successfully stored! Found following function(s): #{ funcs }"
			oBody.functions = JSON.stringify funcs
			oBody.functionArgs = JSON.stringify cm.funcParams
			oBody.comment = cm.comment
			dbMod.storeModule user.username, oBody
			# if oBody.public is 'true'
			# 	dbMod.publish oBody.id
		callback answ

router.post '/store', ( req, res ) ->
	log.info 'SRVC | ACTION DISPATCHERS | Fetching all'
	if req.overwrite
		storeModule user, req, modType, dbMod, callback
	else
		dbMod.getModule user.username, req.id, ( err, mod ) =>
			if mod
				answ.code = 409
				answ.message = 'Module name already existing: ' + req.id
				callback answ
			else
				storeModule user, req, modType, dbMod, callback
