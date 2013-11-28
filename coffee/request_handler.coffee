###

User Handler
============
> TODO Add documentation

###

fs = require 'fs'
path = require 'path'
qs = require 'querystring'

# Requires:

# - The [Logging](logging.html) module
log = require './logging'
# - The [DB Interface](db_interface.html) module
db = require './db_interface'
# - The [Module Manager](module_manager.html) module
mm = require './module_manager'

### Prepare the admin command handlers that are issued via HTTP requests. ###
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


exports.addShutdownHandler = ( fShutdown ) ->
  objAdminCmds.shutdown = fShutdown


exports.handleRequest = ( req, resp ) ->
  req.on 'end', -> resp.end()
  if req.session and req.session.user
    resp.send 'You\'re logged in'
  else
    resp.sendfile path.resolve __dirname, '..', 'webpages', 'handlers', 'login.html'
  req.session.lastPage = req.originalUrl


exports.handleLogin = ( req, resp ) ->
  body = ''
  req.on 'data', ( data ) -> body += data
  req.on 'end', ->
    if not req.session or not req.session.user
      obj = qs.parse body
      db.loginUser obj.username, obj.password, ( err, obj ) ->
        if not err
          req.session.user = obj
        if req.session.user
          resp.write 'Welcome ' + req.session.user.name + '!'
        else
          resp.writeHead 401, { "Content-Type": "text/plain" }
          resp.write 'Login failed!'
        resp.end()
    else
      resp.write 'Welcome ' + req.session.user.name + '!'
      resp.end()


answerHandler = ( resp ) ->
  hasBeenAnswered = false
  postAnswer( msg ) ->
    if not hasBeenAnswered
      resp.write msg
      resp.end()
      hasBeenAnswered = true
  {
    answerSuccess: ( msg ) ->
      if not hasBeenAnswered
        postAnswer msg,
    answerError: ( msg ) ->
      if not hasBeenAnswered
        resp.writeHead 400, { "Content-Type": "text/plain" }
      postAnswer msg,
    isAnswered: -> hasBeenAnswered
  }

# TODO add loadUsers as directive to admin commands
# exports.loadUsers = ->
  # var users = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'users.json')));
  # for(var name in users) {
    # db.storeUser(users[name]);
  # }
# };

onAdminCommand = ( req, response ) ->
  q = req.query;
  log.print 'HL', 'Received admin request: ' + req.originalUrl
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
    log.print 'RS', 'No command in request'
    
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
