
/*

Serve EVENT TRIGGERS
====================
 */
var db, express, log, router;

log = require('../logging');

db = require('../persistence');

express = require('express');

router = module.exports = express.Router();
