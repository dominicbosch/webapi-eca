###

Request Handler
============
> TODO Add documentation

###

# **Requires:**

# - [Logging](logging.html)
log = require './logging'

# - [Persistence](persistence.html)
db = require './persistence'

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
  
# Prepare the user command handlers which are invoked via HTTP requests.
objUserCmds =
  'store_action': mm.storeActionModule
  'get_actionmodules': mm.getAllActionModules
  'store_event': mm.storeEventModule
  'get_eventmodules': mm.getAllEventModules
  'store_rule': mm.storeRule


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
This allows the parent to add the shutdown handler.
The shutdown function will be called if the admin command shutdown is issued.

@public addShutdownHandler( *fShutdown* )
@param {function} fShutdown
###
exports.addShutdownHandler = ( fShutdown ) =>
  @objAdminCmds.shutdown = ( args, answerHandler ) ->
    answerHandler.answerSuccess 'Shutting down... BYE!'
    setTimeout fShutdown, 500


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
      resp.send 'Thank you for the event: ' + obj.event + ' (' + obj.eventid + ')!'
      db.pushEvent obj
    else
      resp.send 400, 'Your event was missing important parameters!'


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
Fetches an include file.

@private getIncludeFileAsString( *name* )
@param {String} name
###
getIncludeFileAsString = ( name ) ->
  pth = path.resolve __dirname, '..', 'webpages', 'handlers', 'includes', name + '.html'
  fs.readFileSync pth, 'utf8'
  
###
Renders a page depending on the user session and returns it.

@private renderPage( *name, sess* )
@param {String} name
@param {Object} sess
###
renderPage = ( name, sess, msg ) ->
  template = getHandlerFileAsString name
  menubar = getIncludeFileAsString 'menubar'
  requires = getIncludeFileAsString 'requires'
  view =
    user: sess.user,
    head_requires: requires,
    div_menubar: menubar,
    message: msg
  mustache.render template, view

###
Sends the desired page or the login to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public renderPageOrLogin( *req, resp, pagename* )
@param {String} pagename
###
sendLoginOrPage = ( pagename, req, resp ) ->
  if !req.session
    req.session = {}
  if !req.session.user
    pagename = 'login'
    # resp.send renderPage pagename, req.session
  # else
    # resp.sendfile getHandlerPath 'login'
  resp.send renderPage pagename, req.session

###
Present the module forge to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForgeModules( *req, resp* )
###
exports.handleForgeModules = ( req, resp ) ->
  sendLoginOrPage 'forge_modules', req, resp

###
Present the rules forge to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForgeRules( *req, resp* )
###
exports.handleForgeRules = ( req, resp ) ->
  sendLoginOrPage 'forge_rules', req, resp

###
Present the event invoke page to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleInvokeEvent( *req, resp* )
###
exports.handleInvokeEvent = ( req, resp ) ->
  sendLoginOrPage 'push_event', req, resp


###
Handles the user command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleUser( *req, resp* )
###
exports.handleUserCommand = ( req, resp ) ->
  if not req.session or not req.session.user
    resp.send 401, 'Login first!'
  else
    body = ''
    req.on 'data', ( data ) ->
      body += data
    req.on 'end', ->
      obj = qs.parse body
      console.log obj
      if typeof objUserCmds[obj.command] is 'function'
        objUserCmds[obj.command] req.session.user, obj, answerHandler req, resp
      else
        resp.send 404, 'Command unknown!'

###
Handles the admin command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleAdmin( *req, resp* )
###
exports.handleAdmin = ( req, resp ) =>
  if req.session and req.session.user
    if req.session.user.isAdmin is "true"
      q = req.query
      log.print 'RH', 'Received admin request: ' + req.originalUrl
      if q.cmd 
        @objAdminCmds[q.cmd]? q, answerHandler req, resp, true
      else
        resp.send 404, 'Command unknown!'
    else
      resp.send renderPage 'unauthorized', req.session
  else
    resp.sendfile getHandlerPath 'login'


 
answerHandler = (req, resp, ntbr) ->
  request = req
  response = resp
  needsToBeRendered = ntbr
  hasBeenAnswered = false
  ret =
    answerSuccess: (msg) ->
      if not hasBeenAnswered
        if needsToBeRendered
          response.send renderPage 'command_answer', request.session, msg
        else
          response.send msg
      hasBeenAnswered = true
    ,
    answerError: (msg) ->
      if not hasBeenAnswered
        if needsToBeRendered
          response.send 400, renderPage 'error', request.session, msg
        else
          response.send 400, msg
      hasBeenAnswered = true
    ,
    isAnswered: -> hasBeenAnswered
  setTimeout(() ->
    ret.answerError 'Strange... maybe try again?'
  , 5000)
  ret

