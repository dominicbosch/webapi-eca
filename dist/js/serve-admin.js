
/*

Serve Code Plugin
=================
> Answers code plugin requests from the user
 */
var db, express, log, router;

log = require('./logging');

db = require('./persistence');

express = require('express');

router = module.exports = express.Router();


/*
Present the admin console to the user if he's allowed to see it.

*Requires
the [request](http://nodejs.org/api/http.html#http_class_http_clientrequest)
and [response](http://nodejs.org/api/http.html#http_class_http_serverresponse)
objects.*

@public handleForge( *req, resp* )
 */

router.post('get', function(req, resp) {
  var msg, page;
  if (!req.session.user) {
    page = 'login';
  } else if (req.session.user.roles.indexOf("admin") === -1) {
    page = 'login';
    msg = 'You need to be admin for this page!';
  } else {
    page = 'admin';
  }
  return renderPage(page, req, resp, msg);
});
