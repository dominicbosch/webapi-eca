var cs = require('coffee-script');
var fs = require('fs');
var csSrc = fs.readFileSync('coffee/config.coffee', { encoding: "utf-8" });
// csSrc = "log = require './logging'";
console.log(cs.compile(csSrc));