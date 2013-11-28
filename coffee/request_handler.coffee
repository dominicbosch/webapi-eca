###

Request Handler
============
> TODO Add documentation

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - [DB Interface](db_interface.html)
db = require './db_interface'

# - [Module Manager](module_manager.html)
mm = require './module_manager'

# - Node.js Modules: [fs](http://nodejs.org/api/fs.html),
#   [path](http://nodejs.org/api/path.html) and
#   [querystring](http://nodejs.org/api/querystring.html)
fs = require 'fs'
path = require 'path'
qs = require 'querystring'

# - External Modules: [mustache](https://github.com/janl/mustache.js) and
#   [crypto-js](https://github.com/evanvosberg/crypto-js)
mustache = require 'mustache'
crypto = require 'crypto-js'

# Prepare the admin command handlers that are invoked via HTTP requests.
objAdminCmds =
  'loadrules': mm.loadRulesFromFS,
  'loadaction': mm.loadActionModuleFromFS,
  'loadactions':  mm.loadActionModulesFromFS,
  'loadevent': mm.loadEventModuleFromFS,
  'loadevents': mm.loadEventModulesFromFS


exports = module.exports = ( args ) -> 
  args = args ? {}
  log args
  db args
  mm args
  mm.addDBLink db
  users = JSON.parse fs.readFileSync path.resolve __dirname, '..', 'config', 'users.json'
  db.storeUser user for user in users
  module.exports

###
This allows the parent to add handlers. The event handler will receive
the events that were received. The shutdown function will be called if the
admin command shutdown is issued.

@public addHandlers( *fShutdown* )
@param {function} fShutdown
###
exports.addHandlers = ( fShutdown ) =>
  objAdminCmds.shutdown = fShutdown


###
Handles possible events that were posted to this server and pushes them into the
event queue.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleEvent( *req, resp* )
###
exports.handleEvent = ( req, resp ) =>
  body = ''
  req.on 'data', ( data ) ->
    body += data
  req.on 'end', =>
    obj = qs.parse body
    # If required event properties are present we process the event #
    if obj and obj.event and obj.eventid
      resp.send 'Thank you for the event (' + obj.event + '[' + obj.eventid + '])!'
      db.pushEvent obj
    else
      resp.writeHead 400, { "Content-Type": "text/plain" }
      resp.send 'Your event was missing important parameters!'


###

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleLogin( *req, resp* )
###
exports.handleLogin = ( req, resp ) ->
  body = ''
  req.on 'data', ( data ) -> body += data
  req.on 'end', ->
    if not req.session or not req.session.user
      obj = qs.parse body
      db.loginUser obj.username, obj.password, ( err, usr ) ->
        if(err)
          # Tapping on fingers, at least in log...
          log.print 'RH', "AUTH-UH-OH (#{obj.username}): " + err.message
        else
          # no error, so we can associate the user object from the DB to the session
          req.session.user = usr
        if req.session.user
          resp.send 'OK!'
        else
          resp.send 401, 'NO!'
    else
      resp.send 'Welcome ' + req.session.user.name + '!'

###
A post request retrieved on this handler causes the user object to be
purged from the session, thus the user will be logged out.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleLogout( *req, resp* )
###
exports.handleLogout = ( req, resp ) ->
  if req.session 
    req.session.user = null
    resp.send 'Bye!'


###
Resolves the path to a handler webpage.

@private getHandlerPath( *name* )
@param {String} name
###
getHandlerPath = ( name ) ->
  path.resolve __dirname, '..', 'webpages', 'handlers', name + '.html'


###
Resolves the path to a handler webpage and returns it as a string.

@private getHandlerFileAsString( *name* )
@param {String} name
###
getHandlerFileAsString = ( name ) ->
  fs.readFileSync getHandlerPath( name ), 'utf8'
  
###
*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleUser( *req, resp* )
###
exports.handleUser = ( req, resp ) ->
  if req.session and req.session.user
    welcome = getHandlerFileAsString 'welcome'
    menubar = getHandlerFileAsString 'menubar'
    view = {
      user: req.session.user,
      div_menubar: menubar
    }
    resp.send mustache.render welcome, view
  else
    resp.sendfile getHandlerPath 'login'

###

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleAdmin( *req, resp* )
###
exports.handleAdmin = ( req, resp ) ->
  if req.session and req.session.user
    if req.session.user.isAdmin is "true"
      welcome = getHandlerFileAsString 'welcome'
      menubar = getHandlerFileAsString 'menubar'
      view =
        user: req.session.user,
        div_menubar: menubar
      resp.send mustache.render welcome, view
    else
      unauthorized = getHandlerFileAsString 'unauthorized'
      menubar = getHandlerFileAsString 'menubar'
      view =
        user: req.session.user,
        div_menubar: menubar
      resp.send mustache.render unauthorized, view
  else
    resp.sendfile getHandlerPath 'login'


onAdminCommand = ( req, response ) ->
  q = req.query
  log.print 'RH', 'Received admin request: ' + q
  if q.cmd
    fAdminCommands q, answerHandler response
    #answerSuccess(response, 'Thank you, we try our best!');
  else answerError response, 'I\'m not sure about what you want from me...'


###
admin commands handler receives all command arguments and an answerHandler
object that eases response handling to the HTTP request issuer.

@private fAdminCommands( *args, answHandler* )
###
fAdminCommands = ( args, answHandler ) ->
  if args and args.cmd 
    adminCmds[args.cmd]? args, answHandler
  else
    log.print 'RH', 'No command in request'
    
  ###
  The fAnsw function receives an answerHandler object as an argument when called
  and returns an anonymous function
  ###
  fAnsw = ( ah ) ->
    ###
    The anonymous function checks whether the answerHandler was already used to
    issue an answer, if no answer was provided we answer with an error message
    ###
    () ->
      if not ah.isAnswered()
        ah.answerError 'Not handled...'
        
  ###
  Delayed function call of the anonymous function that checks the answer handler
  ###
  setTimeout fAnsw(answHandler), 2000
