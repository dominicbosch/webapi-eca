
/*

Serve Webhooks
==============
> Answers webhook requests from the user
 */
var db, exports, express, log;

log = require('../logging');

db = require('../persistence');

express = require('express');

exports = module.exports = express.Router();