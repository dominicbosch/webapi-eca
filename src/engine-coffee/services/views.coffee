
###

Serve Rules
===========
> Answers rule requests from the user

###

# **Loads Modules:**

# - [Logging](logging.html)
log = require '../logging'
# - [Persistence](persistence.html)
db = require '../persistence'
# - External Modules: [express](http://expressjs.com/api.html)
express = require 'express'

router = module.exports = express.Router()


# # Load all existing views
# arrViews = fs.readdirSync path.resolve __dirname 'views'
# isValidRequest = function( req ) {
# 	var name = req.params[ 0 ];
# 	for( var i = 0; i < arrViews.length; i++ ) {
# 		if( arrViews[ i ] === name + '.html' ) return true;
# 	}	
# };
# # Redirect the views that will be loaded by the swig templating engine
# router.get( '/*', function ( req, res ) {
# 	var view = 'index';		
# 	if( isValidRequest( req ) ) view = req.params[ 0 ];
# 	res.render( view, req.session.pub );
# });


router.get '/*', ( req, res ) ->
	log.info 'test'
	res.render 'index', req.session.pub

