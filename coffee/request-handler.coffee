###

Request Handler
============
> The request handler (surprisingly) handles requests made through HTTP to
> the [HTTP Listener](http-listener.html). It will handle user requests for
> pages as well as POST requests such as user login, module storing, event
> invocation and also admin commands.

###

# **Loads Modules:**

# - [Persistence](persistence.html)
db = require './persistence'

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
dirHandlers = path.resolve __dirname, '..', 'webpages', 'handlers'
exports = module.exports = ( args ) => 
  @log = args.logger

  # Register the request service
  @userRequestHandler = args[ 'request-service' ]

  # Register the shutdown handler to the admin command. 
  @objAdminCmds =
    shutdown: ( obj, cb ) ->
      data =
        code: 200
        message: 'Shutting down... BYE!'
      setTimeout args[ 'shutdown-function' ], 500
      cb null, data
  db args

  # Load the standard users from the user config file
  users = JSON.parse fs.readFileSync path.resolve __dirname, '..', 'config', 'users.json'
  fStoreUser = ( username, oUser ) ->
    oUser.username = username
    db.storeUser oUser
  fStoreUser user, users[user] for user of users
  module.exports


###
Handles possible events that were posted to this server and pushes them into the
event queue.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleEvent( *req, resp* )
###
exports.handleEvent = ( req, resp ) ->
  body = ''
  req.on 'data', ( data ) ->
    body += data
  req.on 'end', ->
    if req.session and req.session.user
      try
        obj = JSON.parse body
      catch err
        resp.send 400, 'Badly formed event!'

      # If required event properties are present we process the event #
      if obj and obj.event and not err
        timestamp = ( new Date ).toISOString()
        rand = ( Math.floor Math.random() * 10e9 ).toString( 16 ).toUpperCase()
        obj.eventid = "#{ obj.event }_#{ timestamp }_#{ rand }"
        answ =
          code: 200
          message: "Thank you for the event: #{ obj.eventid }"
        resp.send answ.code, answ
        db.pushEvent obj
      else
        resp.send 400, 'Your event was missing important parameters!'
    else
      resp.send 401, 'Please login!'


###
Associates the user object with the session if login is successful.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleLogin( *req, resp* )
###
exports.handleLogin = ( req, resp ) =>
  body = ''
  req.on 'data', ( data ) -> body += data
  req.on 'end', =>
    obj = qs.parse body
    db.loginUser obj.username, obj.password, ( err, usr ) =>
      if err
        # Tapping on fingers, at least in log...
        @log.warn "RH | AUTH-UH-OH ( #{ obj.username } ): #{ err.message }"
      else
        # no error, so we can associate the user object from the DB to the session
        req.session.user = usr
      if req.session.user
        resp.send 'OK!'
      else
        resp.send 401, 'NO!'

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
  path.join dirHandlers, name + '.html'

###
Fetches a template.

@private getTemplate( *name* )
@param {String} name
###
getTemplate = ( name ) ->
  pth = path.join dirHandlers, 'templates', name + '.html'
  fs.readFileSync pth, 'utf8'
  
###
Fetches a script.

@private getScript( *name* )
@param {String} name
###
getScript = ( name ) ->
  pth = path.join dirHandlers, 'js', name + '.js'
  fs.readFileSync pth, 'utf8'
  
###
Fetches remote scripts snippets.

@private getRemoteScripts( *name* )
@param {String} name
###
getRemoteScripts = ( name ) ->
  pth = path.join dirHandlers, 'remote-scripts', name + '.html'
  fs.readFileSync pth, 'utf8'
  
###
Renders a page, with helps of mustache, depending on the user session and returns it.

@private renderPage( *name, sess, msg* )
@param {String} name
@param {Object} sess
@param {Object} msg
###
renderPage = ( name, req, resp, msg ) ->
  # Grab the skeleton
  pathSkel = path.join dirHandlers, 'skeleton.html'
  skeleton = fs.readFileSync pathSkel, 'utf8'
  code = 200
  data =
    message: msg
    user: req.session.user

  # Try to grab the script belonging to this page. But don't bother if it's not existing
  try
    script = getScript name
  # Try to grab the remote scripts belonging to this page. But don't bother if it's not existing
  try
    remote_scripts = getRemoteScripts name

  # Now try to find the page the user requested.
  try
    content = getTemplate name
  catch err
    # If the page doesn't exist we return the error page, load the error script into it
    # and render the error page with some additional data
    content = getTemplate 'error'
    script = getScript 'error'
    code = 404
    data.message = 'Invalid Page!'

  if req.session.user
    menubar = getTemplate 'menubar'

  pageElements =
    content: content
    script: script
    remote_scripts: remote_scripts
    menubar: menubar

  # First we render the page by including all page elements into the skeleton
  page = mustache.render skeleton, pageElements

  # Then we complete the rendering by adding the data, and send the result to the user
  resp.send code, mustache.render page, data

###
Present the desired forge page to the user.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
###
exports.handleForge = ( req, resp ) ->
  page = req.query.page
  if not req.session.user
    page = 'login'
  renderPage page, req, resp

###
Handles the user command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleUser( *req, resp* )
###
exports.handleUserCommand = ( req, resp ) =>
  if req.session and req.session.user
    body = ''
    #Append data to body while receiving fragments
    req.on 'data', ( data ) ->
      body += data
    req.on 'end', =>
      obj = qs.parse body
      # Let the user request handler service answer the request
      @userRequestHandler req.session.user, obj, ( obj ) ->
        resp.send obj.code, obj
  else
    resp.send 401, 'Login first!'


###
Present the admin console to the user if he's allowed to see it.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
###
exports.handleAdmin = ( req, resp ) ->
  if not req.session.user
    page = 'login'
  # TODO isAdmin should come from the db role
  else if req.session.user.isAdmin isnt "true"
    page = 'login'
    msg = 'You need to be admin!'
  else
    page = 'admin'
  renderPage page, req, resp, msg

###
Handles the admin command requests.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleAdminCommand( *req, resp* )
###
exports.handleAdminCommand = ( req, resp ) =>
  if req.session and
  req.session.user and
  req.session.user.isAdmin is "true"
    body = ''
    req.on 'data', ( data ) ->
      body += data
    req.on 'end', =>
      obj = qs.parse body
      @log.info 'RH | Received admin request: ' + obj.command
      if obj.command and @objAdminCmds[obj.command]
        @objAdminCmds[obj.command] obj, ( err, obj ) ->
          resp.send obj.code, obj
      else
        resp.send 404, 'Command unknown!'
  else
    resp.send 401, 'You need to be logged in as admin!'
  
