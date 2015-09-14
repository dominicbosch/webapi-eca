
###

Serve EVENT TRIGGERS
====================

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()

router.post '/getall', ( req, res ) ->
	log.info 'SRVC | EVENT TRIGGERS | Fetching all'
	db.eventTriggers.getAllModules req.session.pub.username, (err, oETs) ->
		if err
			res.status(500).send err
		else
			res.send oETs

# forgeModule = ( user, oBody, modType, dbMod, callback ) =>
# 	answ = hasRequiredParams [ 'id', 'params', 'lang', 'data' ], oBody
# 	if answ.code isnt 200
# 		callback answ
# 	else
# 		if oBody.overwrite
# 			storeModule user, oBody, modType, dbMod, callback
# 		else
# 			dbMod.getModule user.username, oBody.id, ( err, mod ) =>
# 				if mod
# 					answ.code = 409
# 					answ.message = 'Module name already existing: ' + oBody.id
# 					callback answ
# 				else
# 					storeModule user, oBody, modType, dbMod, callback

# storeModule = ( user, oBody, modType, dbMod, callback ) =>
# 	src = oBody.data

							# args =
							# 	src: obj.data,					# code
							# 	lang: obj.lang,					# script language
							# 	userId: userName,				# userId
							# 	modId: moduleName,				# moduleId
							# 	modType: 'actiondispatcher'		# module type
							# 	oRule: oMyRule.rule,			# oRule
# 	dynmod.compileString src, user.username, id: 'dummyRule', oBody.id, oBody.lang, modType, null, ( cm ) =>
# 		answ = cm.answ
# 		if answ.code is 200
# 			funcs = []
# 			funcs.push name for name, id of cm.module
# 			log.info "CM | Storing new module with functions #{ funcs.join( ', ' ) }"
# 			answ.message = 
# 				" Module #{ oBody.id } successfully stored! Found following function(s): #{ funcs }"
# 			oBody.functions = JSON.stringify funcs
# 			oBody.functionArgs = JSON.stringify cm.funcParams
# 			oBody.comment = cm.comment
# 			dbMod.storeModule user.username, oBody
# 			# if oBody.public is 'true'
# 			# 	dbMod.publish oBody.id
# 		callback answ