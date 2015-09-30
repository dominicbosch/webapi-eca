
/*

Serve Rules
===========
> Answers rule requests from the user
 */
var db, express, log, router;

log = require('../logging');

db = global.db;

express = require('express');

router = module.exports = express.Router();
